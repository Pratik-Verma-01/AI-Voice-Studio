-- Add user_id column to voice_history table
ALTER TABLE voice_history 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing public policies
DROP POLICY IF EXISTS "Allow public insert access" ON voice_history;
DROP POLICY IF EXISTS "Allow public read access" ON voice_history;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view their own voice history"
ON voice_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice history"
ON voice_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice history"
ON voice_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice history"
ON voice_history FOR DELETE
USING (auth.uid() = user_id);