# Stage 5: Student quiz experience

## Goal
Allow students to take quizzes from a share link and submit answers.

## Outcome
Students can complete quizzes without logging in and see initial results.

## Prompts to give an AI agent
1. "Build a student quiz page at /quiz/[token]. Load the assignment and questions using the share_link token."
2. "Create a simple, distraction-free UI for answering MCQ and open-ended questions."
3. "On submit, create an attempt and answers in the database. Grade MCQ instantly and store the result."
4. "Show a results page that displays score, provisional level, and a loading state while AI grading runs."

## Notes
- Keep the student flow fast and friendly.
- Do not require student accounts; collect optional name/email.
