
-- Create image_history table
CREATE TABLE public.image_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own image history"
  ON public.image_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image history"
  ON public.image_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image history"
  ON public.image_history FOR DELETE
  USING (auth.uid() = user_id);
