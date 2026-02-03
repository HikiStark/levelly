import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeMCQ } from '@/lib/grading/mcq'
import { gradeOpenAnswer } from '@/lib/grading/open-answer'
import { calculateLevel } from '@/lib/grading/level-calculator'
import { Question } from '@/lib/supabase/types'

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

    // Create attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempt')
      .insert({
        assignment_id: assignmentId,
        share_link_id: shareLinkId,
        student_name: studentName,
        student_email: studentEmail,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
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
    const mcqQuestions = questions.filter((q) => q.type === 'mcq')
    const openQuestions = questions.filter((q) => q.type === 'open')

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
          score: null, // Will be filled by async grading
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

    // Calculate provisional level (MCQ only for now)
    const provisionalLevel = calculateLevel(mcqScore, mcqTotal || 1)
    const hasOpenQuestions = openQuestions.length > 0

    // Update attempt with provisional results
    await supabase
      .from('attempt')
      .update({
        mcq_score: mcqScore,
        mcq_total: mcqTotal,
        open_total: openTotal,
        total_score: mcqScore,
        max_score: maxScore,
        level: provisionalLevel,
        is_final: !hasOpenQuestions, // Final if no open questions
      })
      .eq('id', attempt.id)

    // If there are open questions, trigger async grading
    if (hasOpenQuestions) {
      // Fire and forget - grade in background
      gradeOpenQuestionsAsync(attempt.id, openQuestions, answers, supabase).catch(
        console.error
      )
    }

    return NextResponse.json({
      attemptId: attempt.id,
      provisionalLevel,
      isFinal: !hasOpenQuestions,
    })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Async function to grade open questions
async function gradeOpenQuestionsAsync(
  attemptId: string,
  openQuestions: Question[],
  answers: { questionId: string; answerText: string | null }[],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  let openScore = 0

  for (const question of openQuestions) {
    const answer = answers.find((a) => a.questionId === question.id)
    const answerText = answer?.answerText || ''

    try {
      const result = await gradeOpenAnswer(question, answerText)
      openScore += result.score

      // Update the answer with AI grading
      await supabase
        .from('answer')
        .update({
          score: result.score,
          ai_feedback: result.feedback,
          ai_graded_at: new Date().toISOString(),
        })
        .eq('attempt_id', attemptId)
        .eq('question_id', question.id)
    } catch (error) {
      console.error(`Error grading question ${question.id}:`, error)
    }
  }

  // Get current attempt to calculate final score
  const { data: attempt } = await supabase
    .from('attempt')
    .select('*')
    .eq('id', attemptId)
    .single()

  if (attempt) {
    const totalScore = attempt.mcq_score + openScore
    const finalLevel = calculateLevel(totalScore, attempt.max_score)

    // Get redirect URL
    const { data: redirect } = await supabase
      .from('level_redirect')
      .select('redirect_url')
      .eq('assignment_id', attempt.assignment_id)
      .eq('level', finalLevel)
      .single()

    // Update attempt with final results
    await supabase
      .from('attempt')
      .update({
        open_score: openScore,
        total_score: totalScore,
        level: finalLevel,
        status: 'graded',
        is_final: true,
      })
      .eq('id', attemptId)
  }
}
