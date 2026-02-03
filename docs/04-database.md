# Levelly Database Structure

This document explains how data is organized and stored in Levelly.

## Table of Contents
- [What is a Database?](#what-is-a-database)
- [Database Tables Overview](#database-tables-overview)
- [Detailed Table Explanations](#detailed-table-explanations)
- [How Tables Connect](#how-tables-connect)
- [Data Examples](#data-examples)

---

## What is a Database?

Think of a database like a **collection of spreadsheets** that are connected to each other.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE = Connected Spreadsheets                     │
└─────────────────────────────────────────────────────────────────────────────┘

   Instead of one giant spreadsheet with everything mixed together...

   ┌────────────────────────────────────────────────────────────────────────┐
   │ Name  │ Email │ Quiz │ Question │ Answer │ Score │ Level │ Created... │
   │ Alice │ a@... │ Math │ What is..│ C      │ 85    │ Adv   │ Jan 1...   │
   │ Alice │ a@... │ Math │ Explain..│ Plants │ 18    │ Adv   │ Jan 1...   │
   │ Bob   │ b@... │ Math │ What is..│ B      │ 0     │ Beg   │ Jan 2...   │
   └────────────────────────────────────────────────────────────────────────┘
   (Messy! Lots of repeated data!)

   We use separate, connected tables...

   TEACHERS          QUIZZES           QUESTIONS         ANSWERS
   ┌─────────┐      ┌─────────┐       ┌─────────┐      ┌─────────┐
   │ Alice   │◄────►│ Math    │◄─────►│ What is │◄────►│ C (85%) │
   │ Bob     │      │ Science │       │ Explain │      │ Plants  │
   └─────────┘      └─────────┘       └─────────┘      └─────────┘
   (Clean! Each piece of information stored once!)
```

---

## Database Tables Overview

Levelly uses **6 main tables** to store all its data:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE TABLES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌────────────────┐
   │    TEACHER     │  People who create quizzes
   │  (User accounts│
   │   for teachers)│
   └───────┬────────┘
           │ creates
           ▼
   ┌────────────────┐
   │   ASSIGNMENT   │  The quizzes/tests
   │   (Quizzes)    │
   └───────┬────────┘
           │
           ├─────────────────┬─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │    QUESTION    │ │   SHARE_LINK   │ │ LEVEL_REDIRECT │
   │  (Quiz items)  │ │ (Access tokens)│ │(Where to send  │
   │                │ │                │ │ each level)    │
   └────────────────┘ └───────┬────────┘ └────────────────┘
                              │
                              │ used by
                              ▼
                      ┌────────────────┐
                      │    ATTEMPT     │  A student's quiz submission
                      │ (Submissions)  │
                      └───────┬────────┘
                              │
                              │ contains
                              ▼
                      ┌────────────────┐
                      │     ANSWER     │  Individual question responses
                      │  (Responses)   │
                      └────────────────┘
```

---

## Detailed Table Explanations

### 1. TEACHER Table

**Purpose:** Stores information about teachers who use Levelly.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TEACHER TABLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   Column       │ What It Stores              │ Example
   ─────────────┼─────────────────────────────┼─────────────────────
   id           │ Unique identifier           │ "abc-123-def"
   user_id      │ Links to login system       │ "user-456-xyz"
   name         │ Teacher's name              │ "Ms. Johnson"
   email        │ Teacher's email             │ "johnson@school.edu"
   created_at   │ When account was created    │ "2024-01-15 10:30:00"

   Example Row:
   ┌────────────┬─────────────┬──────────────┬────────────────────┬──────────────────┐
   │ id         │ user_id     │ name         │ email              │ created_at       │
   ├────────────┼─────────────┼──────────────┼────────────────────┼──────────────────┤
   │ teacher-1  │ auth-user-1 │ Ms. Johnson  │ johnson@school.edu │ 2024-01-15 10:30 │
   └────────────┴─────────────┴──────────────┴────────────────────┴──────────────────┘
```

### 2. ASSIGNMENT Table

**Purpose:** Stores quizzes/tests created by teachers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ASSIGNMENT TABLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   Column       │ What It Stores              │ Example
   ─────────────┼─────────────────────────────┼─────────────────────
   id           │ Unique identifier           │ "quiz-789"
   teacher_id   │ Who created it              │ "teacher-1"
   title        │ Quiz name                   │ "Math Assessment"
   description  │ What the quiz is about      │ "Test your algebra"
   status       │ draft/published/archived    │ "published"
   created_at   │ When quiz was created       │ "2024-01-20 14:00:00"

   Status Meanings:
   ┌─────────────┬──────────────────────────────────────────────────────────────┐
   │ draft       │ Quiz is being created, students CANNOT access it            │
   │ published   │ Quiz is live, students CAN access via share links           │
   │ archived    │ Quiz is no longer active (historical data kept)             │
   └─────────────┴──────────────────────────────────────────────────────────────┘
```

### 3. QUESTION Table

**Purpose:** Stores individual questions within quizzes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             QUESTION TABLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   Column           │ What It Stores                │ Example
   ─────────────────┼───────────────────────────────┼─────────────────────
   id               │ Unique identifier             │ "question-101"
   assignment_id    │ Which quiz it belongs to      │ "quiz-789"
   type             │ "mcq" or "open"               │ "mcq"
   prompt           │ The question text             │ "What is 5 + 3?"
   choices          │ MCQ options (JSON format)     │ [{"id":"a","text":"6"}...]
   correct_choice   │ Correct answer(s)             │ "c" or "a,c"
   reference_answer │ Ideal answer (for open)       │ "Photosynthesis is..."
   rubric           │ Grading instructions (open)   │ "Full points if..."
   points           │ How many points it's worth    │ 10
   order_index      │ Position in quiz              │ 1
   created_at       │ When question was added       │ "2024-01-20 14:15:00"

   MCQ Choices Format (JSON):
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  [                                                                      │
   │    { "id": "a", "text": "6" },                                          │
   │    { "id": "b", "text": "7" },                                          │
   │    { "id": "c", "text": "8" },    ← This is the correct answer          │
   │    { "id": "d", "text": "9" }                                           │
   │  ]                                                                      │
   └─────────────────────────────────────────────────────────────────────────┘
```

### 4. SHARE_LINK Table

**Purpose:** Stores access tokens that let students take quizzes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHARE_LINK TABLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   Column        │ What It Stores              │ Example
   ──────────────┼─────────────────────────────┼─────────────────────
   id            │ Unique identifier           │ "link-555"
   assignment_id │ Which quiz it opens         │ "quiz-789"
   token         │ The secret code in the URL  │ "abc123xyz"
   expires_at    │ When the link stops working │ "2024-12-31 23:59:59"
   is_active     │ Can it still be used?       │ true
   created_at    │ When link was generated     │ "2024-01-25 09:00:00"

   How It Works:
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                                                                         │
   │  URL: https://levelly.com/quiz/abc123xyz                                │
   │                                    ▲                                    │
   │                                    │                                    │
   │                              This is the "token"                        │
   │                                    │                                    │
   │                                    ▼                                    │
   │  System looks up token → Finds quiz-789 → Shows that quiz              │
   │                                                                         │
   └─────────────────────────────────────────────────────────────────────────┘
```

### 5. ATTEMPT Table

**Purpose:** Stores each student's quiz submission.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ATTEMPT TABLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

   Column           │ What It Stores              │ Example
   ─────────────────┼─────────────────────────────┼─────────────────────
   id               │ Unique identifier           │ "attempt-999"
   assignment_id    │ Which quiz was taken        │ "quiz-789"
   share_link_id    │ Which link was used         │ "link-555"
   student_name     │ Student's name (optional)   │ "Alice"
   student_email    │ Student's email (optional)  │ "alice@email.com"
   status           │ in_progress/submitted/      │ "graded"
                    │ grading/graded              │
   submitted_at     │ When quiz was submitted     │ "2024-01-26 10:00:00"
   mcq_score        │ Points from MCQs            │ 70
   mcq_total        │ Max MCQ points              │ 80
   open_score       │ Points from open questions  │ 32
   open_total       │ Max open question points    │ 40
   total_score      │ Combined score              │ 102
   max_score        │ Maximum possible            │ 120
   level            │ beginner/intermediate/adv   │ "advanced"
   is_final         │ Is grading complete?        │ true
   grading_progress │ How many open Qs graded     │ 5
   grading_total    │ Total open Qs to grade      │ 5

   Status Progression:
   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
   │  in_progress  │────►│   submitted   │────►│    grading    │────►│    graded     │
   │               │     │               │     │               │     │               │
   │ Student is    │     │ Just sent to  │     │ AI is grading │     │ All done!     │
   │ taking quiz   │     │ server        │     │ open answers  │     │ Final score   │
   └───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

### 6. ANSWER Table

**Purpose:** Stores each individual answer a student gives.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ANSWER TABLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

   Column          │ What It Stores              │ Example
   ────────────────┼─────────────────────────────┼─────────────────────
   id              │ Unique identifier           │ "answer-1234"
   attempt_id      │ Which submission            │ "attempt-999"
   question_id     │ Which question              │ "question-101"
   selected_choice │ MCQ answer (a, b, c, or d)  │ "c"
   answer_text     │ Open-ended response         │ "Photosynthesis is..."
   is_correct      │ Was it right?               │ true
   score           │ Points earned               │ 10
   ai_feedback     │ AI's explanation (open Qs)  │ "Good answer because..."
   ai_graded_at    │ When AI graded it           │ "2024-01-26 10:00:05"
   submitted_at    │ When answer was saved       │ "2024-01-26 09:58:00"
```

### 7. LEVEL_REDIRECT Table

**Purpose:** Stores where to send students based on their level.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LEVEL_REDIRECT TABLE                                │
└─────────────────────────────────────────────────────────────────────────────┘

   Column        │ What It Stores              │ Example
   ──────────────┼─────────────────────────────┼─────────────────────
   id            │ Unique identifier           │ "redirect-1"
   assignment_id │ Which quiz                  │ "quiz-789"
   level         │ beginner/intermediate/adv   │ "beginner"
   redirect_url  │ Where to send them          │ "https://learn.com/basics"

   Example Setup:
   ┌───────────────┬────────────────────────────────────────────────────────────┐
   │ beginner      │ https://learning-platform.com/math/beginner-course        │
   │ intermediate  │ https://learning-platform.com/math/intermediate-course    │
   │ advanced      │ https://learning-platform.com/math/advanced-course        │
   └───────────────┴────────────────────────────────────────────────────────────┘
```

---

## How Tables Connect

Tables are connected by **IDs** - like reference numbers that link related information together.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TABLE RELATIONSHIPS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   TEACHER    │
                              │              │
                              │  id: T-001   │
                              │  name: "Ms.  │
                              │   Johnson"   │
                              └──────┬───────┘
                                     │
                         teacher_id = T-001
                                     │
                                     ▼
                              ┌──────────────┐
                              │  ASSIGNMENT  │
                              │              │
          ┌───────────────────│  id: A-001   │───────────────────┐
          │                   │  teacher_id: │                   │
          │                   │    T-001     │                   │
          │                   │  title:      │                   │
          │                   │  "Math Quiz" │                   │
          │                   └──────────────┘                   │
          │                          │                           │
          │                          │                           │
          ▼                          ▼                           ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │   QUESTION   │          │  SHARE_LINK  │          │LEVEL_REDIRECT│
   │              │          │              │          │              │
   │  id: Q-001   │          │  id: L-001   │          │  id: R-001   │
   │  assignment_ │          │  assignment_ │          │  assignment_ │
   │  id: A-001   │          │  id: A-001   │          │  id: A-001   │
   │  prompt:     │          │  token:      │          │  level:      │
   │  "What is    │          │  "abc123"    │          │  "beginner"  │
   │   5+3?"      │          │              │          │  url: "..."  │
   └──────────────┘          └──────┬───────┘          └──────────────┘
                                    │
                        share_link_id = L-001
                                    │
                                    ▼
                              ┌──────────────┐
                              │   ATTEMPT    │
                              │              │
                              │  id: AT-001  │
                              │  share_link_ │
                              │  id: L-001   │
                              │  student:    │
                              │  "Alice"     │
                              │  level:      │
                              │  "advanced"  │
                              └──────┬───────┘
                                     │
                          attempt_id = AT-001
                                     │
                                     ▼
                              ┌──────────────┐
                              │    ANSWER    │
                              │              │
                              │  id: AN-001  │
                              │  attempt_id: │
                              │    AT-001    │
                              │  question_id:│
                              │    Q-001     │
                              │  selected:   │
                              │    "c"       │
                              │  score: 10   │
                              └──────────────┘
```

### Reading the Connections

Here's how to follow the chain:

1. **Teacher** (Ms. Johnson, id: T-001) creates...
2. **Assignment** (Math Quiz, id: A-001, teacher_id: T-001) which has...
3. **Questions** (id: Q-001, assignment_id: A-001) and...
4. **Share Links** (token: abc123, assignment_id: A-001) which...
5. **Students use** to create **Attempts** (id: AT-001, share_link_id: L-001) containing...
6. **Answers** (id: AN-001, attempt_id: AT-001, question_id: Q-001)

---

## Data Examples

### Complete Example: A Student Takes a Quiz

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXAMPLE: ALICE TAKES MATH QUIZ                            │
└─────────────────────────────────────────────────────────────────────────────┘

   1. TEACHER EXISTS
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Teacher Table                                                          │
   │ id: "t-001" │ name: "Ms. Johnson" │ email: "johnson@school.edu"        │
   └────────────────────────────────────────────────────────────────────────┘

   2. TEACHER CREATES QUIZ
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Assignment Table                                                       │
   │ id: "a-001" │ teacher_id: "t-001" │ title: "Math Assessment"          │
   │ status: "published"                                                    │
   └────────────────────────────────────────────────────────────────────────┘

   3. QUIZ HAS QUESTIONS
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Question Table                                                         │
   │                                                                        │
   │ id: "q-001" │ assignment_id: "a-001" │ type: "mcq"                     │
   │ prompt: "What is 5 + 3?" │ correct_choice: "c" │ points: 10           │
   │                                                                        │
   │ id: "q-002" │ assignment_id: "a-001" │ type: "open"                    │
   │ prompt: "Explain photosynthesis" │ points: 20                         │
   │ reference_answer: "Plants convert sunlight..."                        │
   └────────────────────────────────────────────────────────────────────────┘

   4. TEACHER CREATES SHARE LINK
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Share_Link Table                                                       │
   │ id: "l-001" │ assignment_id: "a-001" │ token: "xyz789"                 │
   │ is_active: true                                                        │
   └────────────────────────────────────────────────────────────────────────┘

   5. TEACHER SETS UP REDIRECTS
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Level_Redirect Table                                                   │
   │ id: "r-001" │ assignment_id: "a-001" │ level: "beginner"               │
   │ redirect_url: "https://learn.com/basics"                               │
   │                                                                        │
   │ id: "r-002" │ assignment_id: "a-001" │ level: "advanced"               │
   │ redirect_url: "https://learn.com/advanced"                             │
   └────────────────────────────────────────────────────────────────────────┘

   6. ALICE CLICKS LINK AND SUBMITS QUIZ
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Attempt Table                                                          │
   │ id: "at-001" │ assignment_id: "a-001" │ share_link_id: "l-001"         │
   │ student_name: "Alice" │ status: "graded"                               │
   │ mcq_score: 10 │ open_score: 18 │ total_score: 28 │ max_score: 30      │
   │ level: "advanced" │ is_final: true                                     │
   └────────────────────────────────────────────────────────────────────────┘

   7. HER ANSWERS ARE STORED
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Answer Table                                                           │
   │                                                                        │
   │ id: "an-001" │ attempt_id: "at-001" │ question_id: "q-001"             │
   │ selected_choice: "c" │ is_correct: true │ score: 10                    │
   │                                                                        │
   │ id: "an-002" │ attempt_id: "at-001" │ question_id: "q-002"             │
   │ answer_text: "Photosynthesis is when plants use sunlight..."           │
   │ score: 18 │ ai_feedback: "Excellent understanding! Minor point..."     │
   └────────────────────────────────────────────────────────────────────────┘

   8. RESULT
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Alice scored 28/30 (93%) = ADVANCED                                    │
   │ She's redirected to: https://learn.com/advanced                        │
   └────────────────────────────────────────────────────────────────────────┘
```

---

**Previous:** [Architecture](./03-architecture.md)
**Next:** [API Reference](./05-api-reference.md)
