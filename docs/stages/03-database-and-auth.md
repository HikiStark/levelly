# Stage 3: Database + authentication (Supabase)

## Goal
Set up the database schema and teacher authentication.

## Outcome
Supabase tables exist and teacher login/signup works.

## Prompts to give an AI agent
1. "Create a Supabase project and provide SQL to create tables for teacher, assignment, question, share_link, attempt, answer, and level_redirect. Include primary keys, foreign keys, and basic constraints."
2. "Add Supabase client setup in the app (e.g., src/lib/supabase) using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
3. "Build signup and login pages for teachers using Supabase auth. Redirect authenticated users to /teacher."
4. "Add route protection so only authenticated teachers can access /teacher and related pages."

## Notes
- Keep authentication simple (email/password).
- Use row-level security (RLS) recommendations if available.
