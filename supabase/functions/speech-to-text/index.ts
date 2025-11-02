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

    const apiKey = '5dDRzw9257GKPGabIJpruWs2P8V0Y8lA';

    // Create form data for Speechmatic API
    const speechmaticFormData = new FormData();
    speechmaticFormData.append('audio', audioFile);
    speechmaticFormData.append('model', 'whisper-large-v3');

    console.log('Calling Speechmatic API for speech-to-text...');

    const response = await fetch('https://api.speechmatics.com/v2/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: speechmaticFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Speechmatic API error:', errorText);
      throw new Error(`Speechmatic API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Speechmatic API response received');

    return new Response(
      JSON.stringify({ 
        text: result.results?.transcripts?.[0]?.transcript || result.text || '',
        fullResponse: result 
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
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