-- Add type column to voice_history table to differentiate between TTS and STT
ALTER TABLE voice_history 
ADD COLUMN type TEXT NOT NULL DEFAULT 'tts' CHECK (type IN ('tts', 'stt'));

-- Update existing records to be TTS
UPDATE voice_history SET type = 'tts' WHERE type IS NULL;