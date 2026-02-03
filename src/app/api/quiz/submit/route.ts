import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeMCQ } from '@/lib/grading/mcq'
import { gradeWithRetry } from '@/lib/grading/open-answer'
import { calculateLevel } from '@/lib/grading/level-calculator'
import { Database, Question } from '@/lib/supabase/types'

type AttemptInsert = Database['public']['Tables']['attempt']['Insert']

interface SubmitRequest {
  assignmentId: string
  shareLinkId: string
  studentName: string | null
  studentEmail: string | null
  answers: {
    questionId: string
    selectedChoice: string | null
    answerText: string | null
  }[]
}

// Background grading function - runs without blocking the response
async function gradeOpenQuestionsInBackground(
  attemptId: string,
  openQuestions: Question[],
  answers: SubmitRequest['answers'],
  mcqScore: number,
  mcqTotal: number,
  maxScore: number,
  openTotal: number
) {
  // Create a new Supabase client for background processing
  const supabase = await createClient()
  let openScore = 0
  let gradedCount = 0

  for (const question of openQuestions) {
    const answer = answers.find((a) => a.questionId === question.id)
    const answerText = answer?.answerText || ''

    try {
      // Add delay between requests to avoid rate limiting
      if (gradedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const result = await gradeWithRetry(question, answerText)

      // Update the answer with AI grading
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

      // Update progress
      await supabase
        .from('attempt')
        // @ts-expect-error - Supabase types mismatch
        .update({
          grading_progress: gradedCount,
          open_score: openScore,
        })
        .eq('id', attemptId)

    } catch (error) {
      console.error(`Error grading question ${question.id}:`, error)
      gradedCount++

      // Still update progress even on error
      await supabase
        .from('attempt')
        // @ts-expect-error - Supabase types mismatch
        .update({
          grading_progress: gradedCount,
        })
        .eq('id', attemptId)
    }
  }

  // Calculate final results
  const totalScore = mcqScore + openScore
  const finalLevel = calculateLevel(totalScore, maxScore)

  // Update attempt with final results
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

  console.log(`[Grading] Completed grading for attempt ${attemptId}. Score: ${totalScore}/${maxScore}, Level: ${finalLevel}`)
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitRequest = await request.json()
    const { assignmentId, shareLinkId, studentName, studentEmail, answers } = body

    const supabase = await createClient()

    // Get all questions for this assignment
    const { data: questions, error: questionsError } = await supabase
      .from('question')
      .select('*')
      .eq('assignment_id', assignmentId)

    if (questionsError || !questions) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      )
    }

    // Cast to proper type (Supabase types mismatch workaround)
    const typedQuestions = questions as unknown as Question[]
    const openQuestions = typedQuestions.filter((q) => q.type === 'open')

    // Create attempt with grading status
    const attemptInsert = {
      assignment_id: assignmentId,
      share_link_id: shareLinkId,
      student_name: studentName,
      student_email: studentEmail,
      status: openQuestions.length > 0 ? 'grading' : 'graded',
      submitted_at: new Date().toISOString(),
      grading_progress: 0,
      grading_total: openQuestions.length,
    } satisfies AttemptInsert

    const { data: attempt, error: attemptError } = await supabase
      .from('attempt')
      // @ts-expect-error - Supabase types mismatch with generated schema
      .insert(attemptInsert)
      .select()
      .single()

    if (attemptError || !attempt) {
      console.error('Failed to create attempt:', attemptError)
      return NextResponse.json(
        { error: 'Failed to create attempt', details: attemptError?.message },
        { status: 500 }
      )
    }

    // Extract attempt ID (type assertion due to Supabase types mismatch)
    const attemptId = (attempt as { id: string }).id

    // Grade MCQ answers immediately (fast, no API calls)
    let mcqScore = 0
    let mcqTotal = 0

    // Calculate max scores
    const maxScore = typedQuestions.reduce((sum, q) => sum + q.points, 0)
    const openTotal = openQuestions.reduce((sum, q) => sum + q.points, 0)

    // Process and save answers
    const answerInserts = []

    for (const question of typedQuestions) {
      const answer = answers.find((a) => a.questionId === question.id)

      if (question.type === 'mcq') {
        const result = gradeMCQ(question, answer?.selectedChoice ?? null)
        mcqScore += result.score
        mcqTotal += result.maxScore

        answerInserts.push({
          attempt_id: attemptId,
          question_id: question.id,
          selected_choice: answer?.selectedChoice ?? null,
          is_correct: result.isCorrect,
          score: result.score,
        })
      } else {
        answerInserts.push({
          attempt_id: attemptId,
          question_id: question.id,
          answer_text: answer?.answerText ?? null,
          score: null, // Will be filled by background grading
        })
      }
    }

    // Insert all answers
    const { error: answersError } = await supabase
      .from('answer')
      // @ts-expect-error - Supabase types mismatch
      .insert(answerInserts)

    if (answersError) {
      console.error('Error inserting answers:', answersError)
    }

    // If there are open questions, start background grading
    if (openQuestions.length > 0) {
      // Use after() to run grading after response is sent while keeping function alive
      after(async () => {
        try {
          await gradeOpenQuestionsInBackground(
            attemptId,
            openQuestions as Question[],
            answers,
            mcqScore,
            mcqTotal,
            maxScore,
            openTotal
          )
        } catch (error) {
          console.error(`[Grading] Background grading failed for attempt ${attemptId}:`, error)
        }
      })

      // Return immediately - student goes to results page to wait
      return NextResponse.json({
        attemptId,
        status: 'grading',
        isFinal: false,
      })
    }

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

    return NextResponse.json({
      attemptId,
      level: finalLevel,
      status: 'graded',
      isFinal: true,
    })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
