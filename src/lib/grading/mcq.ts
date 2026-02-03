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
  const isCorrect = selectedChoice === question.correct_choice

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
