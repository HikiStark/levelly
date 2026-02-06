Multi-Session Quiz Implementation Plan
Overview
Add ability for teachers to create quizzes with multiple sessions. Students complete sessions sequentially (linear progression, no going back), view level-based content between sessions, and see overall results at the end.

Key Decisions:

Linear progression only - students cannot go back to previous sessions
Session map is visual progress indicator only (non-clickable)
Remove questionnaire functionality entirely (not needed)
Database Changes
New Table: session

CREATE TABLE session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, order_index)
);
New Table: student_journey
Tracks a student's progress across all sessions.


CREATE TABLE student_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignment(id) ON DELETE CASCADE NOT NULL,
  share_link_id UUID REFERENCES share_link(id),
  student_name TEXT,
  student_email TEXT,
  current_session_index INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'in_progress',
  overall_level TEXT,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
Modify Existing Tables
question: Add session_id UUID REFERENCES session(id) (nullable for backward compatibility)
level_redirect: Add session_id UUID REFERENCES session(id) (nullable = final redirect)
attempt: Add session_id UUID and journey_id UUID
Migration File
Create: supabase/migrations/008_multi_session_schema.sql

Type Definitions
New Types in src/lib/supabase/types.ts

export interface Session {
  id: string
  assignment_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
}

export interface StudentJourney {
  id: string
  assignment_id: string
  share_link_id: string | null
  student_name: string | null
  student_email: string | null
  current_session_index: number
  overall_status: 'in_progress' | 'completed'
  overall_level: string | null
  total_score: number
  max_score: number
  started_at: string
  completed_at: string | null
}
API Endpoints
New Endpoints
Endpoint	Method	Purpose
/api/sessions	POST	Create session
/api/sessions/[id]	PUT/DELETE	Update/delete session
/api/sessions/reorder	POST	Reorder sessions
/api/journey	POST	Start student journey
/api/journey/[id]	GET	Get journey status
/api/journey/[id]/summary	GET	Get overall results
Modified Endpoints
POST /api/quiz/submit: Add sessionId, journeyId params, return hasNextSession
GET /api/attempts/[id]: Include session info and journey progress
UI Components
Teacher Side (Session Management)
New: SessionManager component
Location: src/app/teacher/assignments/[id]/session-manager.tsx

List sessions with drag-and-drop reordering
Add/edit/delete sessions
Each session expandable to show its questions
Modified: QuestionList
Filter questions by session
Move questions between sessions
Modified: LevelRedirectSection
Configure redirects per session (content shown after each session)
Configure final redirects (after all sessions complete)
Student Side (Quiz Flow)
New: SessionProgressBar component
Location: src/components/session-progress-bar.tsx

Visual progress showing completed/current/upcoming sessions
Color-coded: green (completed), blue (current), gray (upcoming)
Non-clickable (visual only)
New: SessionMap component
Location: src/components/session-map.tsx

Visual overview shown at quiz start
Shows all sessions with titles
Displays expected flow (what student will encounter)
Non-clickable (informational only)
Modified: QuizContainer
Show session progress bar at top
Pass session context to submit
Modified: ResultsPage
Remove questionnaire section entirely
Show "Continue to Next Session" button after viewing redirect content
If last session: show link to overall summary
New: /results/journey/[journeyId]/page.tsx
Overall results page showing all sessions
Aggregated scores and overall level
Per-session breakdown with individual levels
Student Flow

1. /quiz/[token] → Create journey, show session map overview
2. Start Session 1 → Answer questions
3. Submit → See session 1 results + level
4. View redirect content (embed/link based on level)
5. Click "Next Session" → Start Session 2
6. ... repeat for all sessions ...
7. After final session → Overall results page with aggregated scores
Implementation Phases
Phase 1: Database (Migration + Types)
Files:

supabase/migrations/008_multi_session_schema.sql
src/lib/supabase/types.ts (add new types)
Phase 2: Backend APIs
Files:

src/app/api/sessions/route.ts (new)
src/app/api/sessions/[id]/route.ts (new)
src/app/api/sessions/reorder/route.ts (new)
src/app/api/journey/route.ts (new)
src/app/api/journey/[id]/route.ts (new)
src/app/api/journey/[id]/summary/route.ts (new)
src/app/api/quiz/submit/route.ts (modify)
src/app/api/attempts/[id]/route.ts (modify)
Phase 3: Teacher UI
Files:

src/app/teacher/assignments/[id]/session-manager.tsx (new)
src/app/teacher/assignments/[id]/add-session-dialog.tsx (new)
src/app/teacher/assignments/[id]/page.tsx (modify - add sessions tab)
src/app/teacher/assignments/[id]/question-list.tsx (modify)
src/app/teacher/assignments/[id]/add-question-dialog.tsx (modify)
src/app/teacher/assignments/[id]/level-redirect-section.tsx (modify)
Phase 4: Student UI
Files:

src/components/session-progress-bar.tsx (new)
src/components/session-map.tsx (new)
src/app/quiz/[token]/page.tsx (modify)
src/app/quiz/[token]/quiz-container.tsx (modify)
src/app/results/[attemptId]/page.tsx (modify - remove questionnaire, add next session)
src/app/results/journey/[journeyId]/page.tsx (new - overall results)
Phase 5: Cleanup
Remove questionnaire-related code from results page
Remove questionnaire section from teacher assignment page
Backward Compatibility
Quizzes without sessions continue to work (NULL session_id)
No data migration needed for existing records
Single-session behavior preserved for legacy quizzes
Verification Plan
Create a multi-session quiz as teacher
Add questions to different sessions
Configure level redirects per session
Take quiz as student through all sessions
Verify grading works per session
Verify redirect content shows between sessions
Verify overall results aggregate correctly
Verify old single-session quizzes still work