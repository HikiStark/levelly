-- Create storage bucket and policies for question images

-- 1. Create bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies (RLS is enabled on storage.objects by default in Supabase)
-- Teachers can upload question images
DROP POLICY IF EXISTS "Teachers can upload question images" ON storage.objects;
CREATE POLICY "Teachers can upload question images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'question-images' AND
  auth.uid() IN (SELECT user_id FROM public.teacher)
);

-- Anyone can view question images
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;
CREATE POLICY "Anyone can view question images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'question-images');

-- Teachers can delete question images
DROP POLICY IF EXISTS "Teachers can delete question images" ON storage.objects;
CREATE POLICY "Teachers can delete question images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'question-images' AND
  auth.uid() IN (SELECT user_id FROM public.teacher)
);
