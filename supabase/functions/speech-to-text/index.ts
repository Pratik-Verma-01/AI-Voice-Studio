import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getUser(token);
    if (authError || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (audioFile.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 10MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/mp3"];
    if (!validTypes.includes(audioFile.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!ASSEMBLYAI_API_KEY) {
      console.error("AssemblyAI API key not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Uploading audio file to AssemblyAI...");

    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { authorization: ASSEMBLYAI_API_KEY },
      body: await audioFile.arrayBuffer(),
    });

    if (!uploadResponse.ok) {
      console.error("Upload error:", uploadResponse.status, await uploadResponse.text());
      return new Response(
        JSON.stringify({ error: "Unable to upload audio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { upload_url } = await uploadResponse.json();
    console.log("Audio uploaded successfully");

    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_detection: true,
      }),
    });

    if (!transcriptResponse.ok) {
      console.error("Transcription request error:", transcriptResponse.status);
      return new Response(
        JSON.stringify({ error: "Unable to start transcription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { id } = await transcriptResponse.json();
    console.log("Transcription started:", id);

    let transcriptResult;
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { authorization: ASSEMBLYAI_API_KEY },
      });

      if (!pollingResponse.ok) {
        console.error("Polling error:", pollingResponse.status);
        throw new Error("Polling failed");
      }

      transcriptResult = await pollingResponse.json();

      if (transcriptResult.status === "completed") {
        console.log("Transcription completed successfully");
        break;
      } else if (transcriptResult.status === "error") {
        console.error("Transcription error:", transcriptResult.error);
        throw new Error(transcriptResult.error || "Transcription failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: "Transcription timeout" }),
        { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text: transcriptResult.text || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Transcription error:", e);
    return new Response(
      JSON.stringify({ error: "Unable to process audio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
