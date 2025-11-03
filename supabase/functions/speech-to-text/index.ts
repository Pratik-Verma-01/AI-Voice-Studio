import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error('No audio file provided');
    }

    // Input validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxSize) {
      throw new Error('Audio file must be less than 10MB');
    }

    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    if (!allowedTypes.includes(audioFile.type)) {
      throw new Error('Invalid audio file type');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('API configuration missing');
      throw new Error('Service temporarily unavailable');
    }

    // Create form data for OpenAI Whisper API
    const openAIFormData = new FormData();
    openAIFormData.append('file', audioFile);
    openAIFormData.append('model', 'whisper-1');

    console.log('Calling speech-to-text API...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('STT API error:', response.status, errorText);
      throw new Error('Transcription failed');
    }

    const result = await response.json();
    console.log('Transcription completed successfully');

    return new Response(
      JSON.stringify({ 
        text: result.text || '',
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to process request. Please try again.' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
