-- Add per-question toggle for whether a correct answer exists
ALTER TABLE question
ADD COLUMN IF NOT EXISTS has_correct_answer BOOLEAN DEFAULT true;

UPDATE question
SET has_correct_answer = true
WHERE has_correct_answer IS NULL;

COMMENT ON COLUMN question.has_correct_answer IS 'Whether this question has a correct answer and should be auto-graded';
