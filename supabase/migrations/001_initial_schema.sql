-- Teacher-Student Leveling App Schema
-- Run this in your Supabase SQL Editor

-- 1. Teacher (linked to Supabase Auth)
CREATE TABLE teacher (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Assignment (quiz container)
CREATE TABLE assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teacher(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Question (MCQ or open-ended)
CREATE TABLE question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'open')),
  prompt TEXT NOT NULL,
  choices JSONB, -- For MCQ: [{"id": "a", "text": "Option A"}, ...]
  correct_choice TEXT, -- For MCQ: "a"
  reference_answer TEXT, -- For open: ideal answer
  rubric TEXT, -- For open: grading criteria
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Share Link (token for students to access quiz)
CREATE TABLE share_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Attempt (student taking quiz)
CREATE TABLE attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  share_link_id UUID REFERENCES share_link(id),
  student_name TEXT,
  student_email TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  mcq_score INTEGER DEFAULT 0,
  mcq_total INTEGER DEFAULT 0,
  open_score INTEGER DEFAULT 0,
  open_total INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  level TEXT, -- 'beginner', 'intermediate', 'advanced'
  is_final BOOLEAN DEFAULT false
);

-- 6. Answer (student responses)
CREATE TABLE answer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES attempt(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES question(id) ON DELETE CASCADE NOT NULL,
  selected_choice TEXT, -- For MCQ
  answer_text TEXT, -- For open
  is_correct BOOLEAN, -- For MCQ: immediate grading result
  score INTEGER, -- Points earned
  ai_feedback TEXT, -- For open: AI-generated feedback
  ai_graded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- 7. Level Redirect (level -> URL mapping per assignment)
CREATE TABLE level_redirect (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  level TEXT NOT NULL,
  redirect_url TEXT NOT NULL,
  UNIQUE(assignment_id, level)
);

-- Indexes for performance
CREATE INDEX idx_share_link_token ON share_link(token);
CREATE INDEX idx_attempt_assignment ON attempt(assignment_id);
CREATE INDEX idx_answer_attempt ON answer(attempt_id);
CREATE INDEX idx_question_assignment ON question(assignment_id, order_index);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE teacher ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE question ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_redirect ENABLE ROW LEVEL SECURITY;

-- Teacher policies
CREATE POLICY "Teachers can view own profile" ON teacher
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can insert own profile" ON teacher
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can update own profile" ON teacher
  FOR UPDATE USING (auth.uid() = user_id);

-- Assignment policies
CREATE POLICY "Teachers can view own assignments" ON assignment
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teacher WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can insert own assignments" ON assignment
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM teacher WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can update own assignments" ON assignment
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM teacher WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can delete own assignments" ON assignment
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM teacher WHERE user_id = auth.uid())
  );

-- Question policies (tied to assignment ownership)
CREATE POLICY "Teachers can manage questions" ON question
  FOR ALL USING (
    assignment_id IN (
      SELECT a.id FROM assignment a
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

-- Public read for questions via share link (for students taking quiz)
CREATE POLICY "Anyone can read questions for active share links" ON question
  FOR SELECT USING (
    assignment_id IN (
      SELECT assignment_id FROM share_link WHERE is_active = true
    )
  );

-- Share link policies
CREATE POLICY "Teachers can manage share links" ON share_link
  FOR ALL USING (
    assignment_id IN (
      SELECT a.id FROM assignment a
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read active share links" ON share_link
  FOR SELECT USING (is_active = true);

-- Attempt policies (students can create and view their own attempts)
CREATE POLICY "Anyone can create attempts" ON attempt
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view attempts" ON attempt
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update attempts" ON attempt
  FOR UPDATE USING (true);

-- Answer policies
CREATE POLICY "Anyone can create answers" ON answer
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view answers" ON answer
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update answers" ON answer
  FOR UPDATE USING (true);

-- Level redirect policies
CREATE POLICY "Teachers can manage level redirects" ON level_redirect
  FOR ALL USING (
    assignment_id IN (
      SELECT a.id FROM assignment a
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read level redirects" ON level_redirect
  FOR SELECT USING (true);
