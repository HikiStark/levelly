# Stage 4: Teacher dashboard + quiz builder

## Goal
Let teachers create quizzes, add questions, and publish a shareable link.

## Outcome
Teachers can manage assignments and generate share links.

## Prompts to give an AI agent
1. "Build a teacher dashboard page that lists quizzes (assignments) and a button to create a new quiz."
2. "Create a quiz builder flow where a teacher can set title/description and add questions (MCQ + open-ended). Store questions in the database."
3. "Add a publishing step that creates a share_link token and shows a copyable URL for students."
4. "Allow teachers to configure redirect URLs for each level (beginner/intermediate/advanced)."

## Notes
- Keep the quiz builder simple (a list of questions with add/edit/delete).
- Store questions with type, prompt, choices, correct choice, points, and optional rubric.
