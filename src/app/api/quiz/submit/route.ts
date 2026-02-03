import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeMCQ } from '@/lib/grading/mcq'
import { gradeOpenAnswer } from '@/lib/grading/open-answer'
import { calculateLevel } from '@/lib/grading/level-calculator'
import { Database } from '@/lib/supabase/types'

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

    const mcqQuestions = questions.filter((q) => q.type === 'mcq')
    const openQuestions = questions.filter((q) => q.type === 'open')

    // Create attempt with grading status
    const attemptInsert: AttemptInsert = {
      assignment_id: assignmentId,
      share_link_id: shareLinkId,
      student_name: studentName,
      student_email: studentEmail,
      status: openQuestions.length > 0 ? 'grading' : 'submitted',
      submitted_at: new Date().toISOString(),
      grading_progress: 0,
      grading_total: openQuestions.length,
    }
    const { data: attempt, error: attemptError } = await supabase
      .from('attempt')
      .insert(attemptInsert as never)
      .select()
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Failed to create attempt' },
        { status: 500 }
      )
    }

    // Grade MCQ answers immediately
    let mcqScore = 0
    let mcqTotal = 0

    // Calculate max scores
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)
    const openTotal = openQuestions.reduce((sum, q) => sum + q.points, 0)

    // Process and save answers
    const answerInserts = []

    for (const question of questions) {
      const answer = answers.find((a) => a.questionId === question.id)

      if (question.type === 'mcq') {
        const result = gradeMCQ(question, answer?.selectedChoice ?? null)
        mcqScore += result.score
        mcqTotal += result.maxScore

        answerInserts.push({
          attempt_id: attempt.id,
          question_id: question.id,
          selected_choice: answer?.selectedChoice ?? null,
          is_correct: result.isCorrect,
          score: result.score,
        })
      } else {
        answerInserts.push({
          attempt_id: attempt.id,
          question_id: question.id,
          answer_text: answer?.answerText ?? null,
          score: null, // Will be filled by grading
        })
      }
    }

    // Insert all answers
    const { error: answersError } = await supabase
      .from('answer')
      .insert(answerInserts)

    if (answersError) {
      console.error('Error inserting answers:', answersError)
    }

    // Grade open questions sequentially to avoid API rate limits
    let openScore = 0
    if (openQuestions.length > 0) {
      let gradedCount = 0

      for (const question of openQuestions) {
        const answer = answers.find((a) => a.questionId === question.id)
        const answerText = answer?.answerText || ''

        try {
          const result = await gradeOpenAnswer(question, answerText)

          // Update the answer with AI grading
          await supabase
            .from('answer')
            .update({
              score: result.score,
              ai_feedback: result.feedback,
              ai_graded_at: new Date().toISOString(),
            })
            .eq('attempt_id', attempt.id)
            .eq('question_id', question.id)

          gradedCount++

          // Update progress
          await supabase
            .from('attempt')
            .update({
              grading_progress: gradedCount,
            })
            .eq('id', attempt.id)

          openScore += result.score
        } catch (error) {
          console.error(`Error grading question ${question.id}:`, error)
          gradedCount++
        }
      }
    }

    // Calculate final results
    const totalScore = mcqScore + openScore
    const finalLevel = calculateLevel(totalScore, maxScore)

    // Update attempt with final results
    await supabase
      .from('attempt')
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
      .eq('id', attempt.id)

    return NextResponse.json({
      attemptId: attempt.id,
      level: finalLevel,
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
