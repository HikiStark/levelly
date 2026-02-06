-- Migration: Multi-session quiz support
-- Allows teachers to create quizzes with multiple sessions
-- Students progress through sessions sequentially with level-based content between sessions

-- 1. Create session table (represents a section of a quiz)
CREATE TABLE session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, order_index)
);

-- 2. Create student_journey table (tracks student progress across all sessions)
CREATE TABLE student_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  share_link_id UUID REFERENCES share_link(id),
  student_name TEXT,
  student_email TEXT,
  current_session_index INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'in_progress' CHECK (overall_status IN ('in_progress', 'completed')),
  overall_level TEXT,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 3. Add session_id to question table (nullable for backward compatibility)
ALTER TABLE question
ADD COLUMN session_id UUID REFERENCES session(id) ON DELETE SET NULL;

-- 4. Add session_id to level_redirect table (nullable = final redirect after all sessions)
ALTER TABLE level_redirect
ADD COLUMN session_id UUID REFERENCES session(id) ON DELETE CASCADE;

-- 5. Drop old unique constraint and add new one that includes session_id
-- First drop the check constraint that references redirect content
ALTER TABLE level_redirect DROP CONSTRAINT IF EXISTS check_redirect_content;

-- Drop the old unique constraint
ALTER TABLE level_redirect DROP CONSTRAINT IF EXISTS level_redirect_assignment_id_level_key;

-- Add new unique constraint that includes session_id (allows per-session and final redirects)
ALTER TABLE level_redirect ADD CONSTRAINT level_redirect_unique
  UNIQUE(assignment_id, session_id, level);

-- Re-add the check constraint for redirect content
ALTER TABLE level_redirect
ADD CONSTRAINT check_redirect_content CHECK (
  (redirect_type = 'link' AND redirect_url IS NOT NULL AND redirect_url != '') OR
  (redirect_type = 'embed' AND embed_code IS NOT NULL AND embed_code != '') OR
  (redirect_type IS NULL)
);

-- 6. Add session_id and journey_id to attempt table
ALTER TABLE attempt
ADD COLUMN session_id UUID REFERENCES session(id) ON DELETE CASCADE;

ALTER TABLE attempt
ADD COLUMN journey_id UUID REFERENCES student_journey(id) ON DELETE CASCADE;

-- 7. Indexes for performance
CREATE INDEX idx_session_assignment ON session(assignment_id, order_index);
CREATE INDEX idx_student_journey_assignment ON student_journey(assignment_id);
CREATE INDEX idx_question_session ON question(session_id, order_index);
CREATE INDEX idx_attempt_journey ON attempt(journey_id);
CREATE INDEX idx_attempt_session ON attempt(session_id);
CREATE INDEX idx_level_redirect_session ON level_redirect(session_id);

-- 8. Enable RLS on new tables
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_journey ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for session table

-- Teachers can manage sessions for their own assignments
CREATE POLICY "Teachers can manage sessions" ON session
  FOR ALL USING (
    assignment_id IN (
      SELECT a.id FROM assignment a
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

-- Anyone can read sessions for active share links (for students taking quiz)
CREATE POLICY "Anyone can read sessions for active share links" ON session
  FOR SELECT USING (
    assignment_id IN (
      SELECT assignment_id FROM share_link WHERE is_active = true
    )
  );

-- 10. RLS Policies for student_journey table

-- Anyone can create journeys (students starting a multi-session quiz)
CREATE POLICY "Anyone can create journeys" ON student_journey
  FOR INSERT WITH CHECK (true);

-- Anyone can view journeys
CREATE POLICY "Anyone can view journeys" ON student_journey
  FOR SELECT USING (true);

-- Anyone can update journeys (to track progress)
CREATE POLICY "Anyone can update journeys" ON student_journey
  FOR UPDATE USING (true);

-- Teachers can delete journeys for their assignments
CREATE POLICY "Teachers can delete journeys" ON student_journey
  FOR DELETE USING (
    assignment_id IN (
      SELECT a.id FROM assignment a
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );
