import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!ELEVEN_LABS_API_KEY) {
      console.error('API configuration missing');
      throw new Error('Service temporarily unavailable');
    }

    console.log('Fetching available voices...');

    // Fetch all available voices
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Voice API error:', response.status, errorText);
      throw new Error('Unable to fetch voices');
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.voices?.length || 0} voices`);

    // Return the voices data
    return new Response(
      JSON.stringify({ voices: data.voices || [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching voices:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to process request. Please try again.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
