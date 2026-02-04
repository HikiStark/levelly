import { openai } from '@/lib/openai/client'
import { Question, ImageMapConfig, ImageMapFlag, SliderConfig } from '@/lib/supabase/types'

export interface ImageMapFlagResult {
  flagId: string
  flagLabel: string
  isCorrect: boolean
  score: number
  maxScore: number
  feedback?: string
  needsAIGrading?: boolean
  error?: string
}

export interface ImageMapGradingResult {
  questionId: string
  flagResults: ImageMapFlagResult[]
  immediateScore: number // MCQ + Slider flags
  immediateMaxScore: number
  pendingScore: number // Text flags (to be AI graded)
  pendingMaxScore: number
  totalScore: number
  maxScore: number
}

// Grade a single MCQ flag
function gradeMCQFlag(flag: ImageMapFlag, answer: string | null): ImageMapFlagResult {
  const isCorrect = answer === flag.correct_answer

  return {
    flagId: flag.id,
    flagLabel: flag.label,
    isCorrect,
    score: isCorrect ? flag.points : 0,
    maxScore: flag.points,
    feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${flag.correct_answer}`,
  }
}

// Grade a single slider flag
function gradeSliderFlag(flag: ImageMapFlag, answer: string | null): ImageMapFlagResult {
  const config = flag.slider_config as SliderConfig | undefined

  if (!config) {
    return {
      flagId: flag.id,
      flagLabel: flag.label,
      isCorrect: false,
      score: 0,
      maxScore: flag.points,
      feedback: 'Slider configuration missing',
      error: 'No slider config',
    }
  }

  if (answer === null || answer === '') {
    return {
      flagId: flag.id,
      flagLabel: flag.label,
      isCorrect: false,
      score: 0,
      maxScore: flag.points,
      feedback: 'No answer provided',
    }
  }

  const studentValue = parseFloat(answer)
  if (isNaN(studentValue)) {
    return {
      flagId: flag.id,
      flagLabel: flag.label,
      isCorrect: false,
      score: 0,
      maxScore: flag.points,
      feedback: 'Invalid numeric answer',
    }
  }

  const isCorrect = Math.abs(studentValue - config.correct_value) <= config.tolerance

  return {
    flagId: flag.id,
    flagLabel: flag.label,
    isCorrect,
    score: isCorrect ? flag.points : 0,
    maxScore: flag.points,
    feedback: isCorrect
      ? 'Correct!'
      : `Incorrect. Your answer: ${studentValue}. Correct value: ${config.correct_value} (±${config.tolerance})`,
  }
}

// Grade immediate flags (MCQ and Slider) - synchronous
export function gradeImageMapImmediate(
  question: Question,
  answers: Record<string, string> | null
): ImageMapGradingResult {
  const config = question.image_map_config as ImageMapConfig | null

  if (!config) {
    return {
      questionId: question.id,
      flagResults: [],
      immediateScore: 0,
      immediateMaxScore: 0,
      pendingScore: 0,
      pendingMaxScore: 0,
      totalScore: 0,
      maxScore: question.points,
    }
  }

  const flagResults: ImageMapFlagResult[] = []
  let immediateScore = 0
  let immediateMaxScore = 0
  let pendingMaxScore = 0

  for (const flag of config.flags) {
    const answer = answers?.[flag.id] ?? null

    if (flag.answer_type === 'mcq') {
      const result = gradeMCQFlag(flag, answer)
      flagResults.push(result)
      immediateScore += result.score
      immediateMaxScore += result.maxScore
    } else if (flag.answer_type === 'slider') {
      const result = gradeSliderFlag(flag, answer)
      flagResults.push(result)
      immediateScore += result.score
      immediateMaxScore += result.maxScore
    } else if (flag.answer_type === 'text') {
      // Text flags need AI grading - mark as pending
      flagResults.push({
        flagId: flag.id,
        flagLabel: flag.label,
        isCorrect: false,
        score: 0,
        maxScore: flag.points,
        needsAIGrading: true,
        feedback: 'Pending AI grading...',
      })
      pendingMaxScore += flag.points
    }
  }

  return {
    questionId: question.id,
    flagResults,
    immediateScore,
    immediateMaxScore,
    pendingScore: 0,
    pendingMaxScore,
    totalScore: immediateScore,
    maxScore: immediateMaxScore + pendingMaxScore,
  }
}

// Grade a single text flag using AI
async function gradeTextFlagWithAI(
  flag: ImageMapFlag,
  answer: string | null,
  questionPrompt: string
): Promise<ImageMapFlagResult> {
  const trimmedAnswer = answer?.trim() || ''

  if (!trimmedAnswer) {
    return {
      flagId: flag.id,
      flagLabel: flag.label,
      isCorrect: false,
      score: 0,
      maxScore: flag.points,
      feedback: 'No answer was provided.',
    }
  }

  const systemPrompt = `You are grading a student's answer for a specific point (${flag.label}) on an image map question.

The main question was: ${questionPrompt}

${flag.correct_answer ? `Expected answer: ${flag.correct_answer}` : ''}
${flag.reference_answer ? `Reference answer for comparison: ${flag.reference_answer}` : ''}

Grade based on MEANING and UNDERSTANDING, not exact wording.
- Consider synonyms and different ways of expressing the same idea
- Minor spelling mistakes should not affect the grade if meaning is clear
- Partial credit for partially correct answers

Grade on a scale of 0-10.

Respond with valid JSON:
{
  "score": <number 0-10>,
  "feedback": "<brief feedback>"
}`

  const userPrompt = `Point: ${flag.label}
Student's answer: ${trimmedAnswer}`

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content) as { score: number; feedback: string }

    // Validate
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 10) {
      throw new Error(`Invalid score: ${result.score}`)
    }

    // Normalize score to flag points
    const normalizedScore = Math.round((result.score / 10) * flag.points)
    const isCorrect = normalizedScore >= flag.points * 0.7 // 70%+ is considered correct

    return {
      flagId: flag.id,
      flagLabel: flag.label,
      isCorrect,
      score: normalizedScore,
      maxScore: flag.points,
      feedback: result.feedback || (isCorrect ? 'Good answer!' : 'Answer needs improvement.'),
    }
  } catch (error) {
    console.error(`[ImageMap Grading] Error grading flag ${flag.id}:`, error)

    return {
      flagId: flag.id,
      flagLabel: flag.label,
      isCorrect: false,
      score: 0,
      maxScore: flag.points,
      feedback: 'Unable to grade automatically. Please review manually.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Grade all text flags using AI - async
export async function gradeImageMapTextFlags(
  question: Question,
  answers: Record<string, string> | null
): Promise<ImageMapFlagResult[]> {
  const config = question.image_map_config as ImageMapConfig | null

  if (!config) {
    return []
  }

  const textFlags = config.flags.filter(f => f.answer_type === 'text')
  const results: ImageMapFlagResult[] = []

  for (const flag of textFlags) {
    const answer = answers?.[flag.id] ?? null
    const result = await gradeTextFlagWithAI(flag, answer, question.prompt)
    results.push(result)

    // Add delay between API calls to avoid rate limiting
    if (textFlags.indexOf(flag) < textFlags.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}

// Complete grading including AI for text flags
export async function gradeImageMapComplete(
  question: Question,
  answers: Record<string, string> | null
): Promise<ImageMapGradingResult> {
  // First, grade immediate flags
  const immediateResult = gradeImageMapImmediate(question, answers)

  // If no text flags, return immediately
  if (immediateResult.pendingMaxScore === 0) {
    return immediateResult
  }

  // Grade text flags with AI
  const textFlagResults = await gradeImageMapTextFlags(question, answers)

  // Merge results
  const mergedFlagResults = immediateResult.flagResults.map(fr => {
    if (!fr.needsAIGrading) return fr

    const aiResult = textFlagResults.find(tr => tr.flagId === fr.flagId)
    return aiResult || fr
  })

  // Calculate totals
  const pendingScore = textFlagResults.reduce((sum, r) => sum + r.score, 0)
  const totalScore = immediateResult.immediateScore + pendingScore

  return {
    ...immediateResult,
    flagResults: mergedFlagResults,
    pendingScore,
    totalScore,
  }
}
