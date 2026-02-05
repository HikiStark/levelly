# Levelly API Reference

This document explains how the frontend (what you see) communicates with the backend (the server).

## Table of Contents
- [What is an API?](#what-is-an-api)
- [API Endpoints Overview](#api-endpoints-overview)
- [Detailed Endpoint Documentation](#detailed-endpoint-documentation)
- [Error Handling](#error-handling)

---

## What is an API?

Think of an API as a **waiter in a restaurant**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API = THE WAITER                                     │
└─────────────────────────────────────────────────────────────────────────────┘

   RESTAURANT                              LEVELLY
   ══════════                              ═══════

   ┌──────────┐                          ┌──────────┐
   │ Customer │                          │ Browser  │
   │ (You)    │                          │ (User)   │
   └────┬─────┘                          └────┬─────┘
        │                                      │
        │ "I'd like the pasta"                 │ "Show me quiz abc123"
        │                                      │
        ▼                                      ▼
   ┌──────────┐                          ┌──────────┐
   │  Waiter  │                          │   API    │
   │          │                          │          │
   └────┬─────┘                          └────┬─────┘
        │                                      │
        │ Takes order to kitchen               │ Sends request to server
        │                                      │
        ▼                                      ▼
   ┌──────────┐                          ┌──────────┐
   │ Kitchen  │                          │ Database │
   │          │                          │          │
   └────┬─────┘                          └────┬─────┘
        │                                      │
        │ Prepares food                        │ Gets quiz data
        │                                      │
        ▼                                      ▼
   ┌──────────┐                          ┌──────────┐
   │  Waiter  │                          │   API    │
   │ delivers │                          │ returns  │
   └────┬─────┘                          └────┬─────┘
        │                                      │
        │ Brings pasta to table                │ Sends quiz to browser
        │                                      │
        ▼                                      ▼
   ┌──────────┐                          ┌──────────┐
   │ Customer │                          │ Browser  │
   │ enjoys!  │                          │ displays!│
   └──────────┘                          └──────────┘
```

### API Request Types

| Type | What It Does | Restaurant Analogy |
|------|--------------|-------------------|
| **GET** | Retrieves data | "What's on the menu?" |
| **POST** | Creates new data | "I'd like to place an order" |
| **PUT/PATCH** | Updates existing data | "Can you change my order?" |
| **DELETE** | Removes data | "Please cancel my order" |

---

## API Endpoints Overview

Here are all the API "addresses" that Levelly uses:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API ENDPOINTS MAP                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   QUIZ TAKING (Students)
   ═══════════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ GET  /api/quiz/[token]        → Get quiz by share link                   │
   │ POST /api/quiz/submit         → Submit quiz answers                      │
   └──────────────────────────────────────────────────────────────────────────┘

   RESULTS (Students)
   ══════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ GET  /api/attempts/[id]       → Get results for a submission             │
   └──────────────────────────────────────────────────────────────────────────┘

   ASSIGNMENTS (Teachers)
   ══════════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ GET  /api/assignments         → List all quizzes                         │
   │ POST /api/assignments         → Create new quiz                          │
   │ GET  /api/assignments/[id]    → Get specific quiz                        │
   │ PUT  /api/assignments/[id]    → Update quiz                              │
   └──────────────────────────────────────────────────────────────────────────┘

   QUESTIONS (Teachers)
   ════════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ POST /api/assignments/[id]/questions    → Add question to quiz           │
   │ PUT  /api/questions/[id]                → Update question                │
   │ DELETE /api/questions/[id]              → Remove question                │
   └──────────────────────────────────────────────────────────────────────────┘

   SHARE LINKS (Teachers)
   ══════════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ POST /api/assignments/[id]/share-link   → Generate new share link        │
   └──────────────────────────────────────────────────────────────────────────┘

   SUBMISSIONS (Teachers)
   ══════════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ GET    /api/assignments/[id]/submissions → List all submissions          │
   │ DELETE /api/attempts/[id]                → Delete a submission           │
   │ POST   /api/attempts/[id]/regrade        → Re-grade open questions       │
   └──────────────────────────────────────────────────────────────────────────┘

   LEVEL REDIRECTS (Teachers)
   ══════════════════════════
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ POST /api/assignments/[id]/redirects     → Set link/embed redirect by level│
   └──────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Endpoint Documentation

### Student Endpoints

#### 1. Get Quiz by Token

**What it does:** Retrieves a quiz so a student can take it.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GET /api/quiz/[token]                                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Student clicks a share link like "levelly.com/quiz/abc123"

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST                                                                 │
   │   ───────                                                                 │
   │   URL: /api/quiz/abc123                                                   │
   │   Method: GET                                                             │
   │   No body needed                                                          │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   WHAT HAPPENS                                                            │
   │   ────────────                                                            │
   │   1. Server looks up token "abc123" in share_link table                   │
   │   2. Checks if link is active and not expired                             │
   │   3. Checks if quiz is published                                          │
   │   4. Gets quiz details and all questions                                  │
   │   5. Returns everything (without correct answers!)                        │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   RESPONSE (Success)                                                      │
   │   ──────────────────                                                      │
   │   {                                                                       │
   │     "assignment": {                                                       │
   │       "id": "quiz-789",                                                   │
   │       "title": "Math Assessment",                                         │
   │       "description": "Test your algebra skills"                           │
   │     },                                                                    │
   │     "questions": [                                                        │
   │       {                                                                   │
   │         "id": "q-001",                                                    │
   │         "type": "mcq",                                                    │
   │         "prompt": "What is 5 + 3?",                                       │
   │         "choices": [                                                      │
   │           {"id": "a", "text": "6"},                                       │
   │           {"id": "b", "text": "7"},                                       │
   │           {"id": "c", "text": "8"},                                       │
   │           {"id": "d", "text": "9"}                                        │
   │         ],                                                                │
   │         "points": 10                                                      │
   │       }                                                                   │
   │     ],                                                                    │
   │     "shareLinkId": "link-555"                                             │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

#### 2. Submit Quiz

**What it does:** Sends student's answers to be graded.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/quiz/submit                                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Student clicks "Submit Quiz"

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST                                                                 │
   │   ───────                                                                 │
   │   URL: /api/quiz/submit                                                   │
   │   Method: POST                                                            │
   │   Body:                                                                   │
   │   {                                                                       │
   │     "assignmentId": "quiz-789",                                           │
   │     "shareLinkId": "link-555",                                            │
   │     "studentName": "Alice",           // optional                         │
   │     "studentEmail": "alice@email.com", // optional                        │
   │     "answers": [                                                          │
   │       {                                                                   │
   │         "questionId": "q-001",                                            │
   │         "selectedChoice": "c"         // for MCQ                          │
   │       },                                                                  │
   │       {                                                                   │
   │         "questionId": "q-002",                                            │
   │         "answerText": "Photosynthesis is..." // for open-ended            │
   │       }                                                                   │
   │     ]                                                                     │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   WHAT HAPPENS                                                            │
   │   ────────────                                                            │
   │   1. Creates new "attempt" record in database                             │
   │   2. Saves all answers to database                                        │
   │   3. Grades MCQs IMMEDIATELY (instant!)                                   │
   │   4. Kicks off BACKGROUND grading for open questions                      │
   │   5. Returns attempt ID and provisional info                              │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   RESPONSE                                                                │
   │   ────────                                                                │
   │   {                                                                       │
   │     "attemptId": "attempt-999",                                           │
   │     "status": "grading",              // or "graded" if no open Qs        │
   │     "isFinal": false,                 // true when all grading done       │
   │     "mcqScore": 70,                                                       │
   │     "mcqTotal": 80,                                                       │
   │     "provisionalLevel": "intermediate"                                    │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

Additional answer payload fields by question type:
```json
{
  "answers": [
    { "questionId": "q-slider", "sliderValue": 42 },
    {
      "questionId": "q-image-map",
      "imageMapAnswers": {
        "flag-1": "Nucleus",
        "flag-2": "b",
        "flag-3": "75"
      }
    }
  ]
}
```

#### 3. Get Attempt Results

**What it does:** Gets the results of a quiz submission.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GET /api/attempts/[id]                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Results page loads or polls for updates

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST                                                                 │
   │   ───────                                                                 │
   │   URL: /api/attempts/attempt-999                                          │
   │   Method: GET                                                             │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   RESPONSE                                                                │
   │   ────────                                                                │
   │   {                                                                       │
   │     "attempt": {                                                          │
   │       "id": "attempt-999",                                                │
   │       "status": "graded",                                                 │
   │       "is_final": true,                                                   │
   │       "mcq_score": 70,                                                    │
   │       "mcq_total": 80,                                                    │
   │       "open_score": 32,                                                   │
   │       "open_total": 40,                                                   │
   │       "total_score": 102,                                                 │
   │       "max_score": 120,                                                   │
   │       "level": "advanced",                                                │
   │       "answers": [                                                        │
   │         {                                                                 │
   │           "question": { "prompt": "What is 5+3?", ... },                  │
   │           "selected_choice": "c",                                         │
   │           "is_correct": true,                                             │
   │           "score": 10                                                     │
   │         },                                                                │
   │         {                                                                 │
   │           "question": { "prompt": "Explain photosynthesis", ... },        │
   │           "answer_text": "Photosynthesis is...",                          │
   │           "score": 18,                                                    │
   │           "ai_feedback": "Great explanation! You covered..."              │
   │         }                                                                 │
   │       ]                                                                   │
   │     },                                                                    │
   │     "redirectUrl": "https://learn.com/advanced"                           │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

### Teacher Endpoints

#### 4. Create Question

**What it does:** Adds a new question to a quiz.

Supports question types:
- `mcq`
- `open`
- `slider`
- `image_map`

Optional field for any type:
- `imageUrl` (question image)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/assignments/[id]/questions                                        │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Teacher clicks "Add Question" and fills out the form

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST (MCQ Example)                                                   │
   │   ─────────────────────                                                   │
   │   {                                                                       │
   │     "type": "mcq",                                                        │
   │     "prompt": "What is the capital of France?",                           │
   │     "choices": [                                                          │
   │       { "id": "a", "text": "London" },                                    │
   │       { "id": "b", "text": "Paris" },                                     │
   │       { "id": "c", "text": "Berlin" },                                    │
   │       { "id": "d", "text": "Madrid" }                                     │
   │     ],                                                                    │
   │     "correctChoice": "b",                                                 │
   │     "points": 10                                                          │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST (Open-Ended Example)                                            │
   │   ────────────────────────────                                            │
   │   {                                                                       │
   │     "type": "open",                                                       │
   │     "prompt": "Explain the water cycle in your own words.",               │
   │     "referenceAnswer": "The water cycle involves evaporation...",         │
   │     "rubric": "Full points for mentioning evaporation, condensation...",  │
   │     "points": 20                                                          │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

`REQUEST (Slider Example)`
```json
{
  "type": "slider",
  "prompt": "Set the boiling point of water (C).",
  "sliderConfig": {
    "min": 0,
    "max": 200,
    "step": 1,
    "correct_value": 100,
    "tolerance": 2
  },
  "points": 10
}
```

`REQUEST (Image-Map Example)`
```json
{
  "type": "image_map",
  "prompt": "Label the diagram",
  "imageMapConfig": {
    "base_image_url": "https://.../diagram.png",
    "flags": [
      {
        "id": "f1",
        "x": 0.25,
        "y": 0.35,
        "label": "Part A",
        "answer_type": "text",
        "reference_answer": "Nucleus",
        "points": 2
      }
    ]
  },
  "points": 2
}
```

#### 5. Generate Share Link

**What it does:** Creates a new access link for students.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/assignments/[id]/share-link                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Teacher clicks "Generate Share Link"

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST                                                                 │
   │   ───────                                                                 │
   │   URL: /api/assignments/quiz-789/share-link                               │
   │   Method: POST                                                            │
   │   Body: {} (empty - server generates the token)                           │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   RESPONSE                                                                │
   │   ────────                                                                │
   │   {                                                                       │
   │     "id": "link-556",                                                     │
   │     "token": "newtoken123",                                               │
   │     "url": "https://levelly.com/quiz/newtoken123",                        │
   │     "createdAt": "2024-01-25T10:00:00Z"                                   │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

#### 6. Set Level Redirect

**What it does:** Configures where to send students of each level.

Supports:
- `redirectType: "link"` with `redirectUrl`
- `redirectType: "embed"` with `embedCode`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/assignments/[id]/redirects                                        │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Teacher sets a redirect URL for a level

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST                                                                 │
   │   ───────                                                                 │
   │   {                                                                       │
   │     "level": "beginner",                                                  │
   │     "redirectUrl": "https://learning-platform.com/basics"                 │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   RESPONSE                                                                │
   │   ────────                                                                │
   │   {                                                                       │
   │     "success": true,                                                      │
   │     "redirect": {                                                         │
   │       "id": "redirect-1",                                                 │
   │       "level": "beginner",                                                │
   │       "redirectUrl": "https://learning-platform.com/basics"               │
   │     }                                                                     │
   │   }                                                                       │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

`REQUEST (Embed Redirect Example)`
```json
{
  "level": "beginner",
  "redirectType": "embed",
  "embedCode": "<iframe src=\"https://...\" />"
}
```

#### 7. Delete Attempt

**What it does:** Removes a student's submission (teacher only).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DELETE /api/attempts/[id]                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   When: Teacher deletes a student submission

   Security: Only the teacher who owns the quiz can delete attempts

   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   REQUEST                                                                 │
   │   ───────                                                                 │
   │   URL: /api/attempts/attempt-999                                          │
   │   Method: DELETE                                                          │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   WHAT HAPPENS                                                            │
   │   ────────────                                                            │
   │   1. Verify teacher is logged in                                          │
   │   2. Verify teacher owns the quiz this attempt belongs to                 │
   │   3. Delete all answers for this attempt                                  │
   │   4. Delete the attempt record                                            │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │   RESPONSE                                                                │
   │   ────────                                                                │
   │   { "success": true }                                                     │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

When something goes wrong, the API returns helpful error messages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMMON ERROR RESPONSES                              │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │  400 Bad Request                                                          │
   │  ────────────────                                                         │
   │  Something wrong with what you sent                                       │
   │                                                                           │
   │  { "error": "Missing required field: prompt" }                            │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │  401 Unauthorized                                                         │
   │  ────────────────                                                         │
   │  Not logged in (for teacher-only endpoints)                               │
   │                                                                           │
   │  { "error": "Authentication required" }                                   │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │  403 Forbidden                                                            │
   │  ────────────────                                                         │
   │  Logged in but not allowed to do this                                     │
   │                                                                           │
   │  { "error": "You don't have permission to delete this attempt" }          │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │  404 Not Found                                                            │
   │  ────────────────                                                         │
   │  The thing you're looking for doesn't exist                               │
   │                                                                           │
   │  { "error": "Quiz not found" }                                            │
   │  { "error": "Invalid or expired share link" }                             │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │  500 Internal Server Error                                                │
   │  ────────────────                                                         │
   │  Something broke on the server                                            │
   │                                                                           │
   │  { "error": "An unexpected error occurred" }                              │
   │                                                                           │
   └───────────────────────────────────────────────────────────────────────────┘
```

### Error Flow Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               EXAMPLE: Student uses expired share link                       │
└─────────────────────────────────────────────────────────────────────────────┘

   Student                           Server
      │                                 │
      │  GET /api/quiz/expiredtoken     │
      │ ───────────────────────────────►│
      │                                 │
      │                                 │  1. Look up token
      │                                 │  2. Check: is_active = false OR
      │                                 │           expires_at < now
      │                                 │  3. Token is expired!
      │                                 │
      │    404 Not Found                │
      │ ◄───────────────────────────────│
      │    { "error": "This share       │
      │      link has expired" }        │
      │                                 │
      ▼                                 │
   Page shows:                          │
   "This quiz link has expired.         │
    Please contact your teacher         │
    for a new link."                    │
```

---

## API Communication Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HOW IT ALL FITS TOGETHER                                 │
└─────────────────────────────────────────────────────────────────────────────┘

   STUDENT FLOW
   ════════════

   1. Click link ──► GET /api/quiz/[token] ──► See quiz
   2. Answer Qs  ──► POST /api/quiz/submit ──► Get graded
   3. See results ─► GET /api/attempts/[id] ─► View score & feedback


   TEACHER FLOW
   ═══════════

   1. Login     ──► (handled by Supabase Auth)
   2. Dashboard ──► GET /api/assignments ──────────► See all quizzes
   3. Create    ──► POST /api/assignments ─────────► New quiz
   4. Add Qs    ──► POST /api/assignments/[id]/questions ─► Add questions
   5. Publish   ──► PUT /api/assignments/[id] ─────► Change status
   6. Share     ──► POST /api/assignments/[id]/share-link ─► Get link
   7. Redirects ──► POST /api/assignments/[id]/redirects ──► Set URLs
   8. Review    ──► GET /api/assignments/[id]/submissions ─► See results
```

---

**Previous:** [Database](./04-database.md)
**Back to:** [Introduction](./01-introduction.md)
