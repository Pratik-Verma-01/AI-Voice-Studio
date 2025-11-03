-- Make user_id NOT NULL in voice_history table for better security
-- This ensures all voice history records have proper user ownership
ALTER TABLE voice_history ALTER COLUMN user_id SET NOT NULL;