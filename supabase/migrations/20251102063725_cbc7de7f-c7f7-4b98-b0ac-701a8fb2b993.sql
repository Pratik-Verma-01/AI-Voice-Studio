-- Create voice history table
CREATE TABLE public.voice_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  audio_url TEXT NOT NULL,
  speed DECIMAL DEFAULT 1.0,
  pitch DECIMAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_voice_history_created_at ON public.voice_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.voice_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read (public access)
CREATE POLICY "Allow public read access"
  ON public.voice_history
  FOR SELECT
  USING (true);

-- Create policy to allow anyone to insert
CREATE POLICY "Allow public insert access"
  ON public.voice_history
  FOR INSERT
  WITH CHECK (true);