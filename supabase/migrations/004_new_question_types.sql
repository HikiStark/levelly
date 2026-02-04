-- New Question Types: Slider and Image Map
-- Also adds general image support for all question types

-- 1. Extend question type constraint to include new types
ALTER TABLE question DROP CONSTRAINT IF EXISTS question_type_check;
ALTER TABLE question ADD CONSTRAINT question_type_check
  CHECK (type IN ('mcq', 'open', 'slider', 'image_map'));

-- 2. Add new columns to question table
-- image_url: Optional image for any question type
ALTER TABLE question ADD COLUMN IF NOT EXISTS image_url TEXT;

-- slider_config: Configuration for slider questions
-- Example: { "min": 0, "max": 100, "step": 1, "correct_value": 50, "tolerance": 5 }
ALTER TABLE question ADD COLUMN IF NOT EXISTS slider_config JSONB;

-- image_map_config: Configuration for image-map questions
-- Example: {
--   "base_image_url": "https://...",
--   "flags": [
--     {
--       "id": "flag-1",
--       "x": 0.25,
--       "y": 0.5,
--       "label": "Point A",
--       "answer_type": "text" | "mcq" | "slider",
--       "correct_answer": "answer",
--       "choices": [...],  // for mcq
--       "slider_config": {...},  // for slider
--       "reference_answer": "...",  // for text (AI grading)
--       "points": 1
--     }
--   ]
-- }
ALTER TABLE question ADD COLUMN IF NOT EXISTS image_map_config JSONB;

-- 3. Extend answer table for new question types
-- slider_value: Student's slider answer
ALTER TABLE answer ADD COLUMN IF NOT EXISTS slider_value NUMERIC;

-- image_map_answers: Student's answers for each flag
-- Example: { "flag-1": "answer text", "flag-2": "choice_id", "flag-3": "75" }
ALTER TABLE answer ADD COLUMN IF NOT EXISTS image_map_answers JSONB;

-- 4. Create storage bucket for question images (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('question-images', 'question-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies (run in Supabase dashboard if needed)
-- Note: These may need to be run separately in the Supabase dashboard
-- as storage policies sometimes require different permissions

-- CREATE POLICY "Teachers can upload question images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'question-images' AND
--   auth.uid() IN (SELECT user_id FROM public.teacher)
-- );

-- CREATE POLICY "Anyone can view question images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'question-images');

-- CREATE POLICY "Teachers can delete question images"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'question-images' AND
--   auth.uid() IN (SELECT user_id FROM public.teacher)
-- );
