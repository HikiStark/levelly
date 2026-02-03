# Levelly - Introduction

## What is Levelly?

Levelly is an **AI-powered quiz and assessment platform** designed for educators. Think of it as a smart quiz system that not only tests students but also automatically figures out their skill level and directs them to the right learning resources.

## The Problem It Solves

Imagine you're a teacher with 100 students, and you need to:
1. Test everyone on a topic
2. Figure out who's a beginner, intermediate, or advanced
3. Send each group to different learning materials

Doing this manually would take forever! Levelly automates the entire process.

## How It Works (Simple Explanation)

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE LEVELLY FLOW                         │
└─────────────────────────────────────────────────────────────────┘

   TEACHER                                         STUDENTS
   ═══════                                         ════════
      │                                                │
      │  1. Creates a quiz                             │
      │     with questions                             │
      ▼                                                │
   ┌──────────┐                                        │
   │  Quiz    │                                        │
   │  Ready   │                                        │
   └────┬─────┘                                        │
        │                                              │
        │  2. Generates a                              │
        │     share link                               │
        ▼                                              │
   ┌──────────┐    3. Shares the link    ┌───────────┐│
   │  Link:   │ ──────────────────────►  │  Student  ││
   │  xyz123  │                          │  clicks   ││
   └──────────┘                          │  link     ││
                                         └─────┬─────┘│
                                               │      │
                                               │  4. Takes the quiz
                                               ▼      │
                                         ┌───────────┐│
                                         │  Answers  ││
                                         │  questions││
                                         └─────┬─────┘│
                                               │      │
                                               │  5. Submits
                                               ▼      │
                                         ┌───────────┐
                                         │   AI      │
                                         │  Grades   │
                                         │  Answers  │
                                         └─────┬─────┘
                                               │
                                               │  6. Gets placed
                                               │     into a level
                                               ▼
                                         ┌───────────┐
                                         │ BEGINNER  │ ──► Learning Path A
                                         │   or      │
                                         │INTERMEDIATE──► Learning Path B
                                         │   or      │
                                         │ ADVANCED  │ ──► Learning Path C
                                         └───────────┘
```

## Key Features

### For Teachers
- **Create Quizzes** - Build quizzes with multiple-choice and open-ended questions
- **AI Grading** - Open-ended answers are graded by artificial intelligence
- **Automatic Leveling** - Students are automatically sorted into Beginner, Intermediate, or Advanced
- **Smart Redirects** - Each level can be sent to different learning resources
- **View Results** - See all student submissions and their performance

### For Students
- **Easy Access** - Just click a link, no account needed
- **Clean Interface** - Simple, distraction-free quiz experience
- **Instant Feedback** - See your score and level immediately after submitting
- **Personalized Path** - Get directed to learning materials that match your level

## The Two Types of Questions

### 1. Multiple Choice (MCQ)
- Student picks from 2-4 options
- Can have single or multiple correct answers
- Graded instantly (computer checks if answer matches)

### 2. Open-Ended
- Student writes their own answer in a text box
- **Graded by AI** - The system uses artificial intelligence to understand the answer
- Not word-for-word matching - understands meaning and concepts

## How Scoring Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCORING & LEVELING                          │
└─────────────────────────────────────────────────────────────────┘

   Your Total Score
   ────────────────
         │
         ▼
   ┌───────────────────────────────────────────────────────────┐
   │  0%                    50%                    80%    100% │
   │  ├────────────────────┼────────────────────┼────────────┤ │
   │  │     BEGINNER       │    INTERMEDIATE    │  ADVANCED  │ │
   │  │    (Below 50%)     │    (50% - 79%)     │  (80%+)    │ │
   └───────────────────────────────────────────────────────────┘

   Examples:
   - Score 45%  → Beginner
   - Score 65%  → Intermediate
   - Score 85%  → Advanced
```

## Who Uses Levelly?

| User Type | What They Do |
|-----------|--------------|
| **Teachers** | Create quizzes, manage questions, view student results |
| **Students** | Take quizzes, see their results and level |

## The Technology Behind It

Don't worry if you don't understand all of this - here's a simplified explanation:

| Technology | What It Does | Simple Explanation |
|------------|--------------|-------------------|
| **Next.js** | Builds the website | The framework that makes the whole site work |
| **React** | Creates the interface | Makes buttons, forms, and pages interactive |
| **Supabase** | Stores data | Like a big filing cabinet that keeps all quizzes and answers |
| **OpenAI** | AI for grading | The artificial intelligence that reads and grades open answers |
| **TypeScript** | Programming language | The language the code is written in |

## Quick Summary

**Levelly = Quiz Platform + AI Grading + Automatic Student Leveling**

1. Teacher creates quiz
2. Students take quiz via shared link
3. Multiple choice = instant grading
4. Open-ended = AI grading (takes a few seconds)
5. Student gets a level (Beginner/Intermediate/Advanced)
6. Student gets redirected to appropriate learning materials

---

**Next:** [How It Works (Detailed)](./02-how-it-works.md)
