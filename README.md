# Levelly

An AI-powered quiz and assessment platform that automatically levels students and directs them to appropriate learning resources.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Teacher creates quiz  →  Students take quiz  →  AI grades answers         │
│                                    ↓                                        │
│                         Student gets level (Beginner/Intermediate/Advanced) │
│                                    ↓                                        │
│                         Redirected to appropriate learning path             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

### For Teachers
- Create quizzes with multiple-choice and open-ended questions
- AI-powered grading for open-ended responses
- Automatic student leveling (Beginner, Intermediate, Advanced)
- Configurable redirect URLs for each level
- View all submissions and student performance
- Generate shareable quiz links

### For Students
- Clean, distraction-free quiz interface
- No account required - just click the link
- Instant MCQ grading
- AI feedback on open-ended answers
- Personalized learning path based on performance

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Teacher    │────►│    Quiz      │────►│   Student    │────►│    AI        │
│ creates quiz │     │  Published   │     │ takes quiz   │     │   Grades     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                     ┌──────────────┐     ┌──────────────┐            │
                     │   Learning   │◄────│    Level     │◄───────────┘
                     │   Resource   │     │   Assigned   │
                     └──────────────┘     └──────────────┘
```

### Scoring Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| Beginner | 0-49% | Needs foundational support |
| Intermediate | 50-79% | Has basic understanding, needs practice |
| Advanced | 80-100% | Strong understanding, ready for challenges |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Full-stack React framework |
| **React 19** | UI components |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Styling |
| **Supabase** | Database & Authentication |
| **OpenAI API** | AI grading for open-ended questions |

## Project Structure

```
levelly/
├── src/
│   ├── app/                    # Pages and API routes
│   │   ├── api/                # Backend API endpoints
│   │   │   ├── quiz/           # Quiz fetching & submission
│   │   │   ├── attempts/       # Results & submissions
│   │   │   └── assignments/    # Teacher quiz management
│   │   ├── quiz/[token]/       # Student quiz taking
│   │   ├── results/[id]/       # Results display
│   │   ├── teacher/            # Teacher dashboard
│   │   ├── login/              # Teacher login
│   │   └── signup/             # Teacher signup
│   ├── components/ui/          # Reusable UI components
│   └── lib/
│       ├── grading/            # Grading logic (MCQ & AI)
│       ├── openai/             # OpenAI API integration
│       └── supabase/           # Database client
├── docs/                       # Documentation
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase account
- OpenAI API key

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

Run the following SQL in your Supabase SQL editor to set up the tables:

<details>
<summary>Click to expand database schema</summary>

```sql
-- Teachers table
create table teacher (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- Assignments (quizzes) table
create table assignment (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teacher(id) on delete cascade,
  title text not null,
  description text,
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz default now()
);

-- Questions table
create table question (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignment(id) on delete cascade,
  type text not null check (type in ('mcq', 'open')),
  prompt text not null,
  choices jsonb,
  correct_choice text,
  reference_answer text,
  rubric text,
  points integer default 10,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- Share links table
create table share_link (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignment(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Attempts (student submissions) table
create table attempt (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignment(id) on delete cascade,
  share_link_id uuid references share_link(id),
  student_name text,
  student_email text,
  status text default 'in_progress' check (status in ('in_progress', 'submitted', 'grading', 'graded')),
  submitted_at timestamptz,
  mcq_score integer default 0,
  mcq_total integer default 0,
  open_score integer default 0,
  open_total integer default 0,
  total_score integer default 0,
  max_score integer default 0,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  is_final boolean default false,
  grading_progress integer default 0,
  grading_total integer default 0,
  created_at timestamptz default now()
);

-- Answers table
create table answer (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempt(id) on delete cascade,
  question_id uuid references question(id) on delete cascade,
  selected_choice text,
  answer_text text,
  is_correct boolean,
  score integer default 0,
  ai_feedback text,
  ai_graded_at timestamptz,
  submitted_at timestamptz default now()
);

-- Level redirects table
create table level_redirect (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignment(id) on delete cascade,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  redirect_url text not null,
  created_at timestamptz default now(),
  unique(assignment_id, level)
);
```

</details>

## Documentation

Detailed documentation is available in the [docs/](./docs/) folder:

| Document | Description |
|----------|-------------|
| [Introduction](./docs/01-introduction.md) | Non-technical overview of Levelly |
| [How It Works](./docs/02-how-it-works.md) | User flows and feature walkthroughs |
| [Architecture](./docs/03-architecture.md) | System design and technical diagrams |
| [Database](./docs/04-database.md) | Data model and table relationships |
| [API Reference](./docs/05-api-reference.md) | API endpoints documentation |

## Key Features Explained

### AI Grading

Open-ended questions are graded using OpenAI's GPT model. The AI:
- Understands semantic meaning (not just word matching)
- Considers synonyms and paraphrasing
- Provides constructive feedback
- Uses teacher-provided rubrics when available

### Background Processing

Quiz submission uses background processing for optimal user experience:
1. MCQ questions are graded **instantly**
2. Open-ended questions are graded **in the background**
3. Students see provisional results immediately
4. Final results update automatically when AI grading completes

### Security

- Teachers require authentication (email/password via Supabase)
- Students access quizzes via unique, time-limited share links
- Route protection via middleware
- Row-level security in Supabase

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

For other platforms, build the project with `npm run build` and run with `npm run start`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

---

Built with Next.js and AI-powered by OpenAI
