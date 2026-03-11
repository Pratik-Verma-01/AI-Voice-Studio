
-- Create storage bucket for shared images
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-images', 'shared-images', true);

-- Allow authenticated users to upload
CREATE POLICY "Users can upload shared images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shared-images');

-- Allow public read access
CREATE POLICY "Public read access for shared images" ON storage.objects FOR SELECT USING (bucket_id = 'shared-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own shared images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shared-images' AND (storage.foldername(name))[1] = auth.uid()::text);
