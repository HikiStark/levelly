# Stage 6: AI grading + leveling

## Goal
Grade open-ended answers with OpenAI and assign a student level.

## Outcome
Automatic feedback, scoring, and level-based redirects.

## Prompts to give an AI agent
1. "Integrate the OpenAI API to grade open-ended answers. Use the question prompt, reference answer, rubric, and student response. Return a score, feedback, and explanation."
2. "Run AI grading in the background (or async API route) and update the attempt when grading completes."
3. "Compute total score and assign a level: Beginner (0-49%), Intermediate (50-79%), Advanced (80-100%)."
4. "After grading completes, show the final results page and link/redirect to the teacher-configured resource URL for that level."

## Notes
- Include clear guardrails in the prompt to keep AI feedback constructive.
- Store AI feedback per answer so teachers can review it.
