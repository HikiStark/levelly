import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Attempt } from '@/lib/supabase/types'
import { deleteAttempt, verifyTeacherOwnership } from '@/lib/grading/regrade'

interface AttemptWithRelations extends Attempt {
  session_id: string | null
  journey_id: string | null
  assignment: {
    title: string
    show_correct_answers: boolean
    show_ai_feedback: boolean
  } | null
  share_link: {
    token: string
  } | null
  session: {
    id: string
    title: string
    order_index: number
  } | null
  answer: Array<{
    id: string
    question_id: string
    selected_choice: string | null
    answer_text: string | null
    slider_value: number | null
    image_map_answers: Record<string, string> | null
    is_correct: boolean | null
    score: number | null
    ai_feedback: string | null
    question: {
      prompt: string
      type: string
      points: number
      order_index: number
      correct_choice: string | null
      has_correct_answer: boolean
      reference_answer: string | null
      slider_config: { min: number; max: number; correct_value: number; tolerance: number } | null
      image_map_config: { base_image_url: string; flags: { id: string; label: string; answer_type: string; points: number }[] } | null
      image_url: string | null
    } | null
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: attemptRow, error } = await supabase
      .from('attempt')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !attemptRow) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    const attemptBase = attemptRow as unknown as Attempt

    const answersQuery = supabase
      .from('answer')
      .select(`
        *,
        question(prompt, type, points, order_index, correct_choice, has_correct_answer, reference_answer, slider_config, image_map_config, image_url)
      `)
      .eq('attempt_id', attemptBase.id)

    const assignmentQuery = supabase
      .from('assignment')
      .select('title, show_correct_answers, show_ai_feedback')
      .eq('id', attemptBase.assignment_id)
      .maybeSingle()

    const shareLinkQuery = attemptBase.share_link_id
      ? supabase
          .from('share_link')
          .select('token')
          .eq('id', attemptBase.share_link_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const sessionQuery = attemptBase.session_id
      ? supabase
          .from('session')
          .select('id, title, order_index')
          .eq('id', attemptBase.session_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const [{ data: answers }, { data: assignment }, { data: shareLink }, { data: session }] = await Promise.all([
      answersQuery,
      assignmentQuery,
      shareLinkQuery,
      sessionQuery,
    ])

    const attempt = {
      ...attemptBase,
      assignment: assignment || null,
      share_link: shareLink || null,
      session: session || null,
      answer: (answers || []) as AttemptWithRelations['answer'],
    } as AttemptWithRelations

    // Get redirect info if final
    let redirectInfo: { type: 'link' | 'embed'; url?: string; embedCode?: string } | null = null
    if (attempt.is_final && attempt.level) {
      let redirectQuery = supabase
        .from('level_redirect')
        .select('redirect_type, redirect_url, embed_code')
        .eq('assignment_id', attempt.assignment_id)
        .eq('level', attempt.level)

      if (attempt.session_id) {
        redirectQuery = redirectQuery.eq('session_id', attempt.session_id)
      } else {
        redirectQuery = redirectQuery.is('session_id', null)
      }

      const { data: redirect } = await redirectQuery.single()

      if (redirect) {
        const typedRedirect = redirect as { redirect_type: 'link' | 'embed'; redirect_url: string | null; embed_code: string | null }
        redirectInfo = {
          type: typedRedirect.redirect_type,
          url: typedRedirect.redirect_url || undefined,
          embedCode: typedRedirect.embed_code || undefined,
        }
      }
    }

    // Fetch journey info if applicable
    let journey: { id: string; current_session_index: number; overall_status: string } | null = null
    if (attempt.journey_id) {
      const { data: journeyData } = await supabase
        .from('student_journey')
        .select('id, current_session_index, overall_status')
        .eq('id', attempt.journey_id)
        .maybeSingle()
      journey = journeyData || null
    }

    // Get feedback visibility settings
    const showCorrectAnswers = attempt.assignment?.show_correct_answers ?? true
    const showAiFeedback = attempt.assignment?.show_ai_feedback ?? true

    // Sanitize answers based on visibility settings
    const sanitizedAnswers = attempt.answer.map((ans) => {
      const sanitized = { ...ans }

      // Strip AI feedback if disabled
      if (!showAiFeedback) {
        sanitized.ai_feedback = null
      }

      // Strip correct answer info if disabled
      if (!showCorrectAnswers && ans.question) {
        sanitized.question = {
          ...ans.question,
          correct_choice: null,
          reference_answer: null,
          slider_config: ans.question.slider_config
            ? { ...ans.question.slider_config, correct_value: 0 }
            : null,
        }
        // Also hide is_correct indicator
        sanitized.is_correct = null
      }

      return sanitized
    })

    // Create sanitized attempt
    const sanitizedAttempt = {
      ...attempt,
      answer: sanitizedAnswers,
    }

    return NextResponse.json({
      attempt: sanitizedAttempt,
      redirectInfo,
      journey,
      shareLinkToken: attempt.share_link?.token || null,
      feedbackSettings: {
        showCorrectAnswers,
        showAiFeedback,
      },
    })
  } catch (error) {
    console.error('Error fetching attempt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the attempt to find assignment_id
    const { data: attemptData, error: attemptError } = await supabase
      .from('attempt')
      .select('assignment_id')
      .eq('id', id)
      .single()

    if (attemptError || !attemptData) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    const attempt = attemptData as { assignment_id: string }

    // Verify teacher owns this assignment
    const { authorized, error: authzError } = await verifyTeacherOwnership(
      attempt.assignment_id,
      user.id
    )

    if (!authorized) {
      return NextResponse.json(
        { error: authzError || 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete the attempt
    const { success, error } = await deleteAttempt(id)

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to delete attempt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting attempt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
