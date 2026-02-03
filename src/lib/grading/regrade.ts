import { createClient } from '@/lib/supabase/server'
import { gradeMCQ } from '@/lib/grading/mcq'
import { gradeWithRetry } from '@/lib/grading/open-answer'
import { calculateLevel } from '@/lib/grading/level-calculator'
import { Question } from '@/lib/supabase/types'

interface Answer {
  id: string
  question_id: string
  selected_choice: string | null
  answer_text: string | null
}

// Background grading function for open questions
async function gradeOpenQuestionsForRegrade(
  attemptId: string,
  openQuestions: Question[],
  answers: Answer[],
  mcqScore: number,
  mcqTotal: number,
  maxScore: number,
  openTotal: number
) {
  const supabase = await createClient()
  let openScore = 0
  let gradedCount = 0

  for (const question of openQuestions) {
    const answer = answers.find((a) => a.question_id === question.id)
    const answerText = answer?.answer_text || ''

    try {
      if (gradedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const result = await gradeWithRetry(question, answerText)

      await supabase
        .from('answer')
        // @ts-expect-error - Supabase types mismatch
        .update({
          score: result.score,
          ai_feedback: result.feedback,
          ai_graded_at: new Date().toISOString(),
        })
        .eq('attempt_id', attemptId)
        .eq('question_id', question.id)

      gradedCount++
      openScore += result.score

      await supabase
        .from('attempt')
        // @ts-expect-error - Supabase types mismatch
        .update({
          grading_progress: gradedCount,
          open_score: openScore,
        })
        .eq('id', attemptId)

    } catch (error) {
      console.error(`[Regrade] Error grading question ${question.id}:`, error)
      gradedCount++

      await supabase
        .from('attempt')
        // @ts-expect-error - Supabase types mismatch
        .update({
          grading_progress: gradedCount,
        })
        .eq('id', attemptId)
    }
  }

  const totalScore = mcqScore + openScore
  const finalLevel = calculateLevel(totalScore, maxScore)

  await supabase
    .from('attempt')
    // @ts-expect-error - Supabase types mismatch
    .update({
      mcq_score: mcqScore,
      mcq_total: mcqTotal,
      open_score: openScore,
      open_total: openTotal,
      total_score: totalScore,
      max_score: maxScore,
      level: finalLevel,
      status: 'graded',
      is_final: true,
      grading_progress: openQuestions.length,
    })
    .eq('id', attemptId)

  console.log(`[Regrade] Completed regrading for attempt ${attemptId}. Score: ${totalScore}/${maxScore}, Level: ${finalLevel}`)
}

interface AttemptWithAnswers {
  assignment_id: string
  answer: Answer[]
}

export async function regradeAttempt(attemptId: string): Promise<{
  success: boolean
  error?: string
  backgroundWork?: () => Promise<void>
}> {
  const supabase = await createClient()

  // Get attempt with answers
  const { data: attemptData, error: attemptError } = await supabase
    .from('attempt')
    .select(`
      *,
      answer(*)
    `)
    .eq('id', attemptId)
    .single()

  if (attemptError || !attemptData) {
    return { success: false, error: 'Attempt not found' }
  }

  const attempt = attemptData as unknown as AttemptWithAnswers

  // Get questions for this assignment
  const { data: questions, error: questionsError } = await supabase
    .from('question')
    .select('*')
    .eq('assignment_id', attempt.assignment_id)

  if (questionsError || !questions) {
    return { success: false, error: 'Failed to fetch questions' }
  }

  const typedQuestions = questions as unknown as Question[]
  const openQuestions = typedQuestions.filter((q) => q.type === 'open')
  const answers = (attempt.answer || []) as Answer[]

  // Calculate max scores
  const maxScore = typedQuestions.reduce((sum, q) => sum + q.points, 0)
  const openTotal = openQuestions.reduce((sum, q) => sum + q.points, 0)

  // Reset attempt to grading state
  await supabase
    .from('attempt')
    // @ts-expect-error - Supabase types mismatch
    .update({
      status: openQuestions.length > 0 ? 'grading' : 'graded',
      is_final: openQuestions.length === 0,
      grading_progress: 0,
      grading_total: openQuestions.length,
      mcq_score: 0,
      mcq_total: 0,
      open_score: 0,
      open_total: 0,
      total_score: 0,
    })
    .eq('id', attemptId)

  // Reset answer scores
  await supabase
    .from('answer')
    // @ts-expect-error - Supabase types mismatch
    .update({
      score: null,
      is_correct: null,
      ai_feedback: null,
      ai_graded_at: null,
    })
    .eq('attempt_id', attemptId)

  // Grade MCQ answers immediately
  let mcqScore = 0
  let mcqTotal = 0

  for (const question of typedQuestions) {
    if (question.type !== 'mcq') continue

    const answer = answers.find((a) => a.question_id === question.id)
    const result = gradeMCQ(question, answer?.selected_choice ?? null)
    mcqScore += result.score
    mcqTotal += result.maxScore

    await supabase
      .from('answer')
      // @ts-expect-error - Supabase types mismatch
      .update({
        is_correct: result.isCorrect,
        score: result.score,
      })
      .eq('attempt_id', attemptId)
      .eq('question_id', question.id)
  }

  // If there are open questions, return background work function
  if (openQuestions.length > 0) {
    const backgroundWork = async () => {
      await gradeOpenQuestionsForRegrade(
        attemptId,
        openQuestions,
        answers,
        mcqScore,
        mcqTotal,
        maxScore,
        openTotal
      )
    }
    return { success: true, backgroundWork }
  } else {
    // No open questions - finalize immediately
    const finalLevel = calculateLevel(mcqScore, maxScore)

    await supabase
      .from('attempt')
      // @ts-expect-error - Supabase types mismatch
      .update({
        mcq_score: mcqScore,
        mcq_total: mcqTotal,
        open_score: 0,
        open_total: 0,
        total_score: mcqScore,
        max_score: maxScore,
        level: finalLevel,
        status: 'graded',
        is_final: true,
      })
      .eq('id', attemptId)
  }

  return { success: true }
}

export async function deleteAttempt(attemptId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Delete answers first (due to foreign key constraint)
  const { error: answersError } = await supabase
    .from('answer')
    .delete()
    .eq('attempt_id', attemptId)

  if (answersError) {
    console.error('Error deleting answers:', answersError)
    return { success: false, error: 'Failed to delete answers' }
  }

  // Delete the attempt
  const { error: attemptError } = await supabase
    .from('attempt')
    .delete()
    .eq('id', attemptId)

  if (attemptError) {
    console.error('Error deleting attempt:', attemptError)
    return { success: false, error: 'Failed to delete attempt' }
  }

  return { success: true }
}

export async function verifyTeacherOwnership(
  assignmentId: string,
  userId: string
): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient()

  // Get teacher record for this user
  const { data: teacherData, error: teacherError } = await supabase
    .from('teacher')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (teacherError || !teacherData) {
    return { authorized: false, error: 'Teacher not found' }
  }

  const teacher = teacherData as { id: string }

  // Verify assignment belongs to this teacher
  const { data: assignmentData, error: assignmentError } = await supabase
    .from('assignment')
    .select('teacher_id')
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignmentData) {
    return { authorized: false, error: 'Assignment not found' }
  }

  const assignment = assignmentData as { teacher_id: string }

  if (assignment.teacher_id !== teacher.id) {
    return { authorized: false, error: 'Unauthorized' }
  }

  return { authorized: true }
}
