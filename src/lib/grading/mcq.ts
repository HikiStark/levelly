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
    // Parse correct choices (comma-separated)
    const correctChoices = question.correct_choice.split(',').map(c => c.trim())
    const isMultiAnswer = correctChoices.length > 1

    if (isMultiAnswer) {
      // For multi-answer questions: student must select ALL correct answers and no incorrect ones
      const selectedChoices = selectedChoice.split(',').map(c => c.trim()).filter(Boolean)

      // Check if arrays have the same elements
      const correctSet = new Set(correctChoices)
      const selectedSet = new Set(selectedChoices)

      isCorrect = correctSet.size === selectedSet.size &&
        [...correctSet].every(c => selectedSet.has(c))
    } else {
      // For single-answer questions: check if selected matches the correct answer
      isCorrect = correctChoices.includes(selectedChoice)
    }
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
