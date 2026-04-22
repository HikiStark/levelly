-- Migration: Levelly fixes and new features (idempotent)
-- 1. Student demographics (gender, age) required at quiz entrance
-- 2. Master "show results" toggle per assignment
-- 3. Per-session teacher guidance note shown after grading
-- 4. New Likert-scale question type
--
-- Safe to re-run: every ADD COLUMN uses IF NOT EXISTS and every
-- constraint is dropped before being re-added.

-- 1. Student demographics
ALTER TABLE student_journey
  ADD COLUMN IF NOT EXISTS student_age INTEGER,
  ADD COLUMN IF NOT EXISTS student_gender TEXT;

ALTER TABLE student_journey DROP CONSTRAINT IF EXISTS student_journey_gender_check;
ALTER TABLE student_journey
  ADD CONSTRAINT student_journey_gender_check
    CHECK (student_gender IS NULL OR student_gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say'));

ALTER TABLE student_journey DROP CONSTRAINT IF EXISTS student_journey_age_check;
ALTER TABLE student_journey
  ADD CONSTRAINT student_journey_age_check
    CHECK (student_age IS NULL OR (student_age >= 5 AND student_age <= 100));

ALTER TABLE attempt
  ADD COLUMN IF NOT EXISTS student_age INTEGER,
  ADD COLUMN IF NOT EXISTS student_gender TEXT;

ALTER TABLE attempt DROP CONSTRAINT IF EXISTS attempt_gender_check;
ALTER TABLE attempt
  ADD CONSTRAINT attempt_gender_check
    CHECK (student_gender IS NULL OR student_gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say'));

ALTER TABLE attempt DROP CONSTRAINT IF EXISTS attempt_age_check;
ALTER TABLE attempt
  ADD CONSTRAINT attempt_age_check
    CHECK (student_age IS NULL OR (student_age >= 5 AND student_age <= 100));

-- 2. Master show-results toggle
ALTER TABLE assignment
  ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT true;

COMMENT ON COLUMN assignment.show_results IS 'When false, students see a thank-you screen instead of their score/level/feedback after submitting';

-- 3. Per-session guidance note + AI feedback toggle
ALTER TABLE session
  ADD COLUMN IF NOT EXISTS guidance_note TEXT,
  ADD COLUMN IF NOT EXISTS show_ai_feedback BOOLEAN DEFAULT false;

COMMENT ON COLUMN session.guidance_note IS 'Teacher-authored note shown to students after they finish grading this session';
COMMENT ON COLUMN session.show_ai_feedback IS 'When true, students see AI-generated feedback for each answer on this session''s grading page. Off by default.';

-- 3b. Assignment-level guidance note (shown on the submitted/thank-you screen)
ALTER TABLE assignment
  ADD COLUMN IF NOT EXISTS guidance_note TEXT;

COMMENT ON COLUMN assignment.guidance_note IS 'Teacher-authored message shown to students after submitting the quiz, regardless of show_results';

-- 4. Likert scale question type
ALTER TABLE question DROP CONSTRAINT IF EXISTS question_type_check;
ALTER TABLE question ADD CONSTRAINT question_type_check
  CHECK (type IN ('mcq', 'open', 'slider', 'image_map', 'likert'));

-- likert_config: { "scale": 5, "min_label": "Strongly Disagree", "max_label": "Strongly Agree", "labels": ["Strongly Disagree", ...optional per-point labels] }
ALTER TABLE question ADD COLUMN IF NOT EXISTS likert_config JSONB;

-- Reuse slider_value numeric column on answer table to store the selected Likert point (1..scale)
