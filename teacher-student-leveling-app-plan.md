# Teacher–Student Leveling App — Fast, Scalable Plan (No-Code)

This document summarizes an optimized architecture and build plan for a platform where a **teacher** shares a **link** to a set of questions, **students** answer (MCQ + open), an **LLM** can grade open answers, and the system computes a **level** and shows a **redirect link** based on that level.

---

## 1) Keep the student experience always fast

**Golden rule:** never block the UI on LLM grading.

### Student flow (fast path)
1. Student opens a **share link** → sees the quiz immediately (questions are pre-fetched/cached).
2. Student answers:
   - **MCQ**: grade instantly (deterministic, no AI).
   - **Open answer**: save answer instantly → show “Submitted ✅” instantly.
3. After submit:
   - Show **provisional level** immediately (based on MCQ + basic rules).
   - Update to **final level** when AI grading finishes (async).
4. When final level is ready → show the level + **redirect link**.

**Why it’s fast:** app servers do only DB work in the critical path; AI runs asynchronously.

---

## 2) Data model that keeps reads cheap & writes clean

Avoid “arrays of IDs” and repeated `context` blobs. Use a clear relationship model:

### Core entities
#### Teacher
- `teacher(id, name, email, ...)`

#### Assignment (the thing a link opens)
- `assignment(id, teacher_id, title, status, created_at)`
- `assignment_question(id, assignment_id, question_id, order, points, difficulty_tag)`

#### Question bank
- `question(id, type, prompt, choices_json, correct_choice, rubric_json, reference_answer_text, created_at, version)`
  - `type`: `mcq` or `open`
  - `choices_json`: only for MCQ
  - `reference_answer_text`: optional (teacher may not provide)
  - `rubric_json`: optional (improves grading consistency)

#### Share link (token)
- `share_link(id, assignment_id, token_hash, expires_at, max_attempts, settings_json)`
  - Store only a **hash** of the token (not the raw token).

#### Student attempt
- `attempt(id, assignment_id, share_link_id, student_identifier, started_at, submitted_at, status)`
  - `student_identifier`: login/email OR an anonymous session id (if you want no-auth quizzes)

#### Answers
- `answer(id, attempt_id, question_id, answer_text, selected_choice, submitted_at)`
  - MCQ uses `selected_choice`
  - Open uses `answer_text`

#### AI grading output (separate table)
- `answer_grade(id, answer_id, score, feedback_text, confidence, model, tokens_used, created_at)`

#### Attempt result (level + redirect)
- `attempt_result(attempt_id, level, final_url, computed_at, is_final)`

---

## 3) Use a queue for LLM grading (and grade only what needs AI)

### Grading strategy
- **MCQ**: immediate deterministic grading (cheap + instant).
- **Open answer**:
  - If teacher provided reference answer/rubric → AI compares and scores.
  - If teacher provided nothing → AI can grade via general rubric criteria
    (clarity, correctness, completeness), or you can do lighter classification.

### Async grading pattern
On student submit:
1. Set `attempt.status = submitted`
2. Enqueue jobs for open answers (one per answer or per attempt)
3. Return immediately with provisional result

Worker:
- Fetch attempt + relevant questions + answers
- Call LLM
- Store `answer_grade`
- Compute final level + final redirect URL
- Update `attempt_result.is_final = true`

**Result:** UI stays fast and resilient.

---

## 4) Make LLM grading cheaper, faster, more consistent

### A) Cache LLM results aggressively
Cache key hash:
- `hash(question_version + student_answer + reference_answer + rubric + grading_prompt_version)`

Store cache in:
- DB table: `llm_cache(hash_key, response_json, created_at)`  
  and/or
- Redis (faster), with DB fallback.

### B) Don’t send huge “context” every time
Minimize payload to LLM:
- question prompt
- student answer
- optional reference answer
- optional rubric
- strict output schema

### C) Two-step grading for savings
1. Cheap pass: quick classification (good/okay/bad)
2. Deep pass only for borderline cases

### D) Force structured output (JSON)
Always require:
- numeric score (0–10)
- short feedback
- confidence
- missing key points

This reduces retries and parsing errors.

---

## 5) Compute “level” deterministically (avoid extra AI calls)

Do not primarily ask AI “what level is this student?”. Instead:
- Convert each question result into a numeric score
- Weighted sum by difficulty/points
- Map score bands → levels (Beginner/Intermediate/Advanced or A/B/C)

This is:
- fast
- explainable
- consistent

(You can later add normalization by cohort, item response theory, etc.)

---

## 6) Link + redirect design (fast + safe)

### Share link
- URL: `/l/<token>`
- Store only `token_hash`
- Resolve token → assignment via indexed lookup

### Redirect after leveling
Store redirect rules per assignment:
- `assignment_level_redirect(assignment_id, level, url)`

Then `attempt_result.final_url` becomes a simple lookup.

---

## 7) Performance checklist (DB + caching)

### DB indexes that matter
- `share_link(token_hash)` **unique**
- `assignment_question(assignment_id, order)`
- `attempt(assignment_id, submitted_at)`
- `answer(attempt_id, question_id)`
- `answer_grade(answer_id)` **unique**

### Keep hot reads small
- Avoid loading grading history when fetching questions
- Consider separating very large text blobs if needed later

### Use Redis for
- share-link resolution cache
- assignment payload cache
- rate limiting (per link / per IP)
- job de-duplication (avoid grading same attempt twice)

---

## 8) UX techniques that make it *feel* faster
- Instant “Submitted ✅”
- Progress indicator: “Grading open answers (2/5)…”
- Results permalink: `/results/<attempt_id>`
- Auto-refresh results until `is_final=true`

---

## 9) Build order (practical implementation roadmap)
1. Teacher: create assignment + generate share link
2. Student: open link → attempt created → answer saving
3. Instant MCQ grading
4. Queue + worker for open answers (LLM grading)
5. Store grades + compute final level + choose redirect
6. Results page: provisional → final updates
7. Caching + rate limits + observability

---

## Outcome
This design keeps:
- **student UX instant**
- **teacher workflow simple**
- **LLM cost controlled**
- **system scalable** via async grading and caching
