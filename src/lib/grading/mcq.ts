import { Question } from '@/lib/supabase/types'

export interface MCQGradingResult {
  questionId: string
  isCorrect: boolean
  score: number
  maxScore: number
}

export function gradeMCQ(
  question: Question,
  selectedChoice: string | null
): MCQGradingResult {
  // Support both single correct_choice (string) and multiple correct_choices (array)
  // The correct_choice field can contain comma-separated values for multiple correct answers
  let isCorrect = false

  if (selectedChoice && question.correct_choice) {
    // Check if correct_choice contains multiple answers (comma-separated)
    const correctChoices = question.correct_choice.split(',').map(c => c.trim())
    isCorrect = correctChoices.includes(selectedChoice)
  }

  return {
    questionId: question.id,
    isCorrect,
    score: isCorrect ? question.points : 0,
    maxScore: question.points,
  }
}

export function gradeMCQBatch(
  questions: Question[],
  answers: { questionId: string; selectedChoice: string | null }[]
): {
  results: MCQGradingResult[]
  totalScore: number
  maxScore: number
} {
  const results: MCQGradingResult[] = []
  let totalScore = 0
  let maxScore = 0

  for (const question of questions) {
    if (question.type !== 'mcq') continue

    const answer = answers.find(a => a.questionId === question.id)
    const result = gradeMCQ(question, answer?.selectedChoice ?? null)

    results.push(result)
    totalScore += result.score
    maxScore += result.maxScore
  }

  return { results, totalScore, maxScore }
}
