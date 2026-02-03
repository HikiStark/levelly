-- Questionnaire Feature Schema
-- Adds optional post-quiz questionnaires for student feedback

-- 1. Questionnaire (one per assignment, optional)
CREATE TABLE questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Post-Quiz Feedback',
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Questionnaire Question
CREATE TABLE questionnaire_question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES questionnaire(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'rating', 'mcq')),
  prompt TEXT NOT NULL,
  options JSONB, -- MCQ: [{"id": "a", "text": "Option A"}, ...], Rating: {"min": 1, "max": 5}
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Questionnaire Response (one per student attempt)
CREATE TABLE questionnaire_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES questionnaire(id) ON DELETE CASCADE NOT NULL,
  attempt_id UUID REFERENCES attempt(id) ON DELETE CASCADE NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(questionnaire_id, attempt_id)
);

-- 4. Questionnaire Answer (individual answers)
CREATE TABLE questionnaire_answer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES questionnaire_response(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questionnaire_question(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  answer_rating INTEGER,
  answer_choice TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, question_id)
);

-- Indexes for performance
CREATE INDEX idx_questionnaire_assignment ON questionnaire(assignment_id);
CREATE INDEX idx_questionnaire_question_order ON questionnaire_question(questionnaire_id, order_index);
CREATE INDEX idx_questionnaire_response_attempt ON questionnaire_response(attempt_id);
CREATE INDEX idx_questionnaire_response_questionnaire ON questionnaire_response(questionnaire_id);
CREATE INDEX idx_questionnaire_answer_response ON questionnaire_answer(response_id);

-- Enable RLS
ALTER TABLE questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_question ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_response ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_answer ENABLE ROW LEVEL SECURITY;

-- Questionnaire policies
CREATE POLICY "Teachers can manage questionnaires" ON questionnaire
  FOR ALL USING (
    assignment_id IN (
      SELECT a.id FROM assignment a
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read enabled questionnaires" ON questionnaire
  FOR SELECT USING (
    is_enabled = true AND
    assignment_id IN (
      SELECT assignment_id FROM share_link WHERE is_active = true
    )
  );

-- Questionnaire question policies
CREATE POLICY "Teachers can manage questionnaire questions" ON questionnaire_question
  FOR ALL USING (
    questionnaire_id IN (
      SELECT q.id FROM questionnaire q
      JOIN assignment a ON q.assignment_id = a.id
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read enabled questionnaire questions" ON questionnaire_question
  FOR SELECT USING (
    questionnaire_id IN (
      SELECT id FROM questionnaire WHERE is_enabled = true
    )
  );

-- Questionnaire response policies
CREATE POLICY "Anyone can create questionnaire responses" ON questionnaire_response
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can view questionnaire responses" ON questionnaire_response
  FOR SELECT USING (
    questionnaire_id IN (
      SELECT q.id FROM questionnaire q
      JOIN assignment a ON q.assignment_id = a.id
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view own questionnaire responses" ON questionnaire_response
  FOR SELECT USING (true);

-- Questionnaire answer policies
CREATE POLICY "Anyone can create questionnaire answers" ON questionnaire_answer
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can view questionnaire answers" ON questionnaire_answer
  FOR SELECT USING (
    response_id IN (
      SELECT qr.id FROM questionnaire_response qr
      JOIN questionnaire q ON qr.questionnaire_id = q.id
      JOIN assignment a ON q.assignment_id = a.id
      JOIN teacher t ON a.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view questionnaire answers" ON questionnaire_answer
  FOR SELECT USING (true);
