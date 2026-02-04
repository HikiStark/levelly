import { Question, SliderConfig } from '@/lib/supabase/types'

export interface SliderGradingResult {
  questionId: string
  isCorrect: boolean
  score: number
  maxScore: number
  studentValue: number | null
  correctValue: number
  tolerance: number
}

export function gradeSlider(
  question: Question,
  sliderValue: number | null
): SliderGradingResult {
  const config = question.slider_config as SliderConfig

  if (!config) {
    return {
      questionId: question.id,
      isCorrect: false,
      score: 0,
      maxScore: question.points,
      studentValue: sliderValue,
      correctValue: 0,
      tolerance: 0,
    }
  }

  if (sliderValue === null) {
    return {
      questionId: question.id,
      isCorrect: false,
      score: 0,
      maxScore: question.points,
      studentValue: null,
      correctValue: config.correct_value,
      tolerance: config.tolerance,
    }
  }

  // Check if student's answer is within tolerance of correct value
  const isCorrect = Math.abs(sliderValue - config.correct_value) <= config.tolerance

  return {
    questionId: question.id,
    isCorrect,
    score: isCorrect ? question.points : 0,
    maxScore: question.points,
    studentValue: sliderValue,
    correctValue: config.correct_value,
    tolerance: config.tolerance,
  }
}

export function gradeSliderBatch(
  questions: Question[],
  answers: { questionId: string; sliderValue: number | null }[]
): {
  results: SliderGradingResult[]
  totalScore: number
  maxScore: number
} {
  const results: SliderGradingResult[] = []
  let totalScore = 0
  let maxScore = 0

  for (const question of questions) {
    if (question.type !== 'slider') continue

    const answer = answers.find(a => a.questionId === question.id)
    const result = gradeSlider(question, answer?.sliderValue ?? null)

    results.push(result)
    totalScore += result.score
    maxScore += result.maxScore
  }

  return { results, totalScore, maxScore }
}
