-- Add feedback visibility settings to assignment table
-- Teachers can control what information students see after completing the quiz

ALTER TABLE assignment
ADD COLUMN show_correct_answers BOOLEAN DEFAULT true,
ADD COLUMN show_ai_feedback BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN assignment.show_correct_answers IS 'Whether students can see correct answers after submission';
COMMENT ON COLUMN assignment.show_ai_feedback IS 'Whether students can see AI-generated feedback after submission';
