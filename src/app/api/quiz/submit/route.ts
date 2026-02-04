import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeMCQ } from '@/lib/grading/mcq'
import { gradeWithRetry } from '@/lib/grading/open-answer'
import { gradeSlider } from '@/lib/grading/slider'
import { gradeImageMapImmediate, gradeImageMapTextFlags } from '@/lib/grading/image-map'
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
    sliderValue: number | null
    imageMapAnswers: Record<string, string> | null
  }[]
}

// Background grading function - runs without blocking the response
async function gradeQuestionsInBackground(
  attemptId: string,
  questionsToGrade: { question: Question; answer: SubmitRequest['answers'][0] }[],
  immediateScore: number,
  immediateTotal: number,
  maxScore: number,
  pendingTotal: number
) {
  // Create a new Supabase client for background processing
  const supabase = await createClient()
  let pendingScore = 0
  let gradedCount = 0

  for (const { question, answer } of questionsToGrade) {
    try {
      // Add delay between requests to avoid rate limiting
      if (gradedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (question.type === 'open') {
        // Grade open-ended question with AI
        const answerText = answer?.answerText || ''
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

        pendingScore += result.score
      } else if (question.type === 'image_map') {
        // Grade image-map text flags with AI
        const imageMapAnswers = answer?.imageMapAnswers || null
        const textFlagResults = await gradeImageMapTextFlags(question, imageMapAnswers)

        // Sum up text flag scores
        const textFlagScore = textFlagResults.reduce((sum, r) => sum + r.score, 0)
        const feedback = textFlagResults.map(r => `${r.flagLabel}: ${r.feedback}`).join('\n')

        // Get current answer to add to existing score
        const { data: currentAnswer } = await supabase
          .from('answer')
          .select('score')
          .eq('attempt_id', attemptId)
          .eq('question_id', question.id)
          .single()

        const existingScore = (currentAnswer as { score: number | null } | null)?.score || 0

        await supabase
          .from('answer')
          // @ts-expect-error - Supabase types mismatch
          .update({
            score: existingScore + textFlagScore,
            ai_feedback: feedback,
            ai_graded_at: new Date().toISOString(),
          })
          .eq('attempt_id', attemptId)
          .eq('question_id', question.id)

        pendingScore += textFlagScore
      }

      gradedCount++

      // Update progress
      await supabase
        .from('attempt')
        // @ts-expect-error - Supabase types mismatch
        .update({
          grading_progress: gradedCount,
          open_score: pendingScore,
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
  const totalScore = immediateScore + pendingScore
  const finalLevel = calculateLevel(totalScore, maxScore)

  // Update attempt with final results
  await supabase
    .from('attempt')
    // @ts-expect-error - Supabase types mismatch
    .update({
      mcq_score: immediateTotal,
      mcq_total: immediateTotal,
      open_score: pendingScore,
      open_total: pendingTotal,
      total_score: totalScore,
      max_score: maxScore,
      level: finalLevel,
      status: 'graded',
      is_final: true,
      grading_progress: questionsToGrade.length,
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

    // Find questions that need background AI grading
    const openQuestions = typedQuestions.filter((q) => q.type === 'open')
    const imageMapQuestionsWithText = typedQuestions.filter((q) => {
      if (q.type !== 'image_map' || !q.image_map_config) return false
      const config = q.image_map_config as { flags: { answer_type: string }[] }
      return config.flags.some(f => f.answer_type === 'text')
    })
    const questionsNeedingAIGrading = [...openQuestions, ...imageMapQuestionsWithText]

    // Create attempt with grading status
    const attemptInsert = {
      assignment_id: assignmentId,
      share_link_id: shareLinkId,
      student_name: studentName,
      student_email: studentEmail,
      status: questionsNeedingAIGrading.length > 0 ? 'grading' : 'graded',
      submitted_at: new Date().toISOString(),
      grading_progress: 0,
      grading_total: questionsNeedingAIGrading.length,
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

    // Grade deterministic answers immediately (MCQ, slider, image-map MCQ/slider flags)
    let immediateScore = 0
    let immediateTotal = 0

    // Calculate max scores
    const maxScore = typedQuestions.reduce((sum, q) => sum + q.points, 0)

    // Calculate pending total (open questions + image-map text flags)
    let pendingTotal = openQuestions.reduce((sum, q) => sum + q.points, 0)
    for (const q of imageMapQuestionsWithText) {
      const config = q.image_map_config as { flags: { answer_type: string; points: number }[] }
      pendingTotal += config.flags
        .filter(f => f.answer_type === 'text')
        .reduce((sum, f) => sum + f.points, 0)
    }

    // Process and save answers
    const answerInserts = []

    for (const question of typedQuestions) {
      const answer = answers.find((a) => a.questionId === question.id)

      if (question.type === 'mcq') {
        const result = gradeMCQ(question, answer?.selectedChoice ?? null)
        immediateScore += result.score
        immediateTotal += result.maxScore

        answerInserts.push({
          attempt_id: attemptId,
          question_id: question.id,
          selected_choice: answer?.selectedChoice ?? null,
          is_correct: result.isCorrect,
          score: result.score,
        })
      } else if (question.type === 'slider') {
        const result = gradeSlider(question, answer?.sliderValue ?? null)
        immediateScore += result.score
        immediateTotal += result.maxScore

        answerInserts.push({
          attempt_id: attemptId,
          question_id: question.id,
          slider_value: answer?.sliderValue ?? null,
          is_correct: result.isCorrect,
          score: result.score,
        })
      } else if (question.type === 'image_map') {
        const imageMapAnswers = answer?.imageMapAnswers ?? null
        const result = gradeImageMapImmediate(question, imageMapAnswers)

        // Immediate score from MCQ and slider flags
        immediateScore += result.immediateScore
        immediateTotal += result.immediateMaxScore

        answerInserts.push({
          attempt_id: attemptId,
          question_id: question.id,
          image_map_answers: imageMapAnswers,
          is_correct: result.immediateScore === result.immediateMaxScore && result.pendingMaxScore === 0,
          score: result.immediateScore, // Text flags will be added by background grading
        })
      } else {
        // Open question - will be graded in background
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

    // If there are questions needing AI grading, start background grading
    if (questionsNeedingAIGrading.length > 0) {
      // Prepare questions with their answers for background grading
      const questionsToGrade = questionsNeedingAIGrading.map(q => ({
        question: q,
        answer: answers.find(a => a.questionId === q.id)!,
      }))

      // Use after() to run grading after response is sent while keeping function alive
      after(async () => {
        try {
          await gradeQuestionsInBackground(
            attemptId,
            questionsToGrade,
            immediateScore,
            immediateTotal,
            maxScore,
            pendingTotal
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

    // No AI grading needed - finalize immediately
    const finalLevel = calculateLevel(immediateScore, maxScore)

    await supabase
      .from('attempt')
      // @ts-expect-error - Supabase types mismatch
      .update({
        mcq_score: immediateScore,
        mcq_total: immediateTotal,
        open_score: 0,
        open_total: 0,
        total_score: immediateScore,
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
