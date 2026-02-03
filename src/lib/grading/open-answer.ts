import { openai } from '@/lib/openai/client'
import { Question } from '@/lib/supabase/types'

export interface OpenAnswerGradingResult {
  questionId: string
  score: number
  maxScore: number
  feedback: string
  error?: string
}

export class GradingError extends Error {
  constructor(
    message: string,
    public readonly code: 'API_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'EMPTY_RESPONSE',
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'GradingError'
  }
}

export async function gradeOpenAnswer(
  question: Question,
  studentAnswer: string
): Promise<OpenAnswerGradingResult> {
  // Handle empty student answer
  const trimmedAnswer = studentAnswer?.trim() || ''

  if (!trimmedAnswer) {
    return {
      questionId: question.id,
      score: 0,
      maxScore: question.points,
      feedback: 'No answer was provided.',
    }
  }

  const systemPrompt = `You are an intelligent grading assistant that evaluates student answers based on MEANING and UNDERSTANDING, not only on exact wording.

Your task:
1. First, understand what the question is asking
2. Understand what the student's answer means and what they are trying to convey
3. Compare the SEMANTIC MEANING of the student's answer to the expected answer
4. Check for the correctness of the student's answer based on the online trusted sources if available and if expected answer is not provided, use your own knowledge to grade the answer.
5. Grade based on how well the student demonstrated understanding of the concept

IMPORTANT GRADING PRINCIPLES:
- Answers do NOT need to match word-for-word with the reference answer
- If the student's answer conveys the same meaning or correct concept, it should receive full or near-full credit
- Consider synonyms, paraphrasing, and different ways of expressing the same idea as correct
- Focus on whether the student understood and answered the question correctly
- Minor spelling mistakes or grammatical errors should not significantly affect the grade if the meaning is clear
- Partial credit should be given for partially correct answers

${question.rubric ? `\nGRADING RUBRIC:\n${question.rubric}` : ''}
${question.reference_answer ? `\nREFERENCE ANSWER (for meaning comparison, not exact matching):\n${question.reference_answer}` : ''}

Grade on a scale of 0-10 where:
- 10: Perfect understanding, answer fully addresses the question
- 7-9: Good understanding with minor gaps or imprecision
- 4-6: Partial understanding, some key points missing
- 1-3: Limited understanding, significant gaps
- 0: No relevant answer or completely incorrect

Respond with valid JSON:
{
  "score": <number 0-10>,
  "feedback": "<brief constructive feedback explaining the grade>"
}`

  const userPrompt = `QUESTION: ${question.prompt}

STUDENT'S ANSWER: ${trimmedAnswer}`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new GradingError(
        'OpenAI returned an empty response',
        'EMPTY_RESPONSE'
      )
    }

    let result: { score: number; feedback: string }
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      throw new GradingError(
        `Failed to parse OpenAI response as JSON: ${content}`,
        'PARSE_ERROR',
        parseError
      )
    }

    // Validate the response structure
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 10) {
      throw new GradingError(
        `Invalid score received: ${result.score}. Expected number between 0-10.`,
        'VALIDATION_ERROR'
      )
    }

    if (typeof result.feedback !== 'string' || !result.feedback.trim()) {
      // Use a default feedback if missing
      result.feedback = result.score >= 7
        ? 'Good answer!'
        : result.score >= 4
          ? 'Partially correct answer.'
          : 'Answer needs improvement.'
    }

    // Convert 0-10 score to points based on question.points
    const normalizedScore = Math.round((result.score / 10) * question.points)

    return {
      questionId: question.id,
      score: normalizedScore,
      maxScore: question.points,
      feedback: result.feedback,
    }
  } catch (error) {
    // Log detailed error for debugging
    if (error instanceof GradingError) {
      console.error(`[Grading Error] ${error.code}: ${error.message}`, {
        questionId: question.id,
        questionPrompt: question.prompt.substring(0, 100),
        studentAnswer: trimmedAnswer.substring(0, 100),
        cause: error.cause,
      })
    } else if (error instanceof Error) {
      console.error(`[Grading Error] API_ERROR: ${error.message}`, {
        questionId: question.id,
        questionPrompt: question.prompt.substring(0, 100),
        studentAnswer: trimmedAnswer.substring(0, 100),
        stack: error.stack,
      })
    } else {
      console.error('[Grading Error] Unknown error:', error)
    }

    // Return a fallback result with error details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      questionId: question.id,
      score: 0,
      maxScore: question.points,
      feedback: 'Unable to grade this answer automatically. Please review manually.',
      error: errorMessage,
    }
  }
}

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export async function gradeWithRetry(
  question: Question,
  studentAnswer: string,
  retries = MAX_RETRIES
): Promise<OpenAnswerGradingResult> {
  const result = await gradeOpenAnswer(question, studentAnswer)

  // If there was an error and we have retries left, try again
  if (result.error && retries > 0) {
    console.log(`[Grading] Retrying question ${question.id}, ${retries} retries left`)
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    return gradeWithRetry(question, studentAnswer, retries - 1)
  }

  return result
}

export async function gradeOpenAnswersBatch(
  questions: Question[],
  answers: { questionId: string; answerText: string | null }[]
): Promise<{
  results: OpenAnswerGradingResult[]
  totalScore: number
  maxScore: number
  failedCount: number
}> {
  const results: OpenAnswerGradingResult[] = []
  let totalScore = 0
  let maxScore = 0
  let failedCount = 0

  for (const question of questions) {
    if (question.type !== 'open') continue

    const answer = answers.find(a => a.questionId === question.id)
    const result = await gradeWithRetry(question, answer?.answerText ?? '')

    results.push(result)
    totalScore += result.score
    maxScore += result.maxScore

    if (result.error) {
      failedCount++
    }
  }

  if (failedCount > 0) {
    console.warn(`[Grading] ${failedCount}/${results.length} questions failed to grade automatically`)
  }

  return { results, totalScore, maxScore, failedCount }
}
