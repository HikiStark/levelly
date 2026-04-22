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
    show_results: boolean
    guidance_note: string | null
  } | null
  share_link: {
    token: string
  } | null
  session: {
    id: string
    title: string
    order_index: number
    guidance_note: string | null
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
      likert_config: { scale: number; min_label?: string; max_label?: string; labels?: string[] } | null
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
        question(prompt, type, points, order_index, correct_choice, has_correct_answer, reference_answer, slider_config, image_map_config, likert_config, image_url)
      `)
      .eq('attempt_id', attemptBase.id)

    const assignmentQuery = supabase
      .from('assignment')
      .select('title, show_correct_answers, show_ai_feedback, show_results, guidance_note')
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
          .select('id, title, order_index, guidance_note')
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

    // Fetch the embedded/redirect learning material for this student's level.
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

      const { data: redirect } = await redirectQuery.maybeSingle()

      if (redirect) {
        const typed = redirect as { redirect_type: 'link' | 'embed'; redirect_url: string | null; embed_code: string | null }
        redirectInfo = {
          type: typed.redirect_type,
          url: typed.redirect_url || undefined,
          embedCode: typed.embed_code || undefined,
        }
      }
    }

    // Each session owns its guidance message; shown after that session's grading.
    const guidanceNote = attempt.session?.guidance_note?.trim() || null

    // Students get the score/level summary and the embedded learning material.
    // Per-question feedback (correct answers, AI review) is kept off — the answer
    // array is stripped here so the "Question Details" card never renders.
    const studentSafeAttempt = {
      ...attempt,
      answer: [],
    }

    return NextResponse.json({
      attempt: studentSafeAttempt,
      redirectInfo,
      journey,
      shareLinkToken: attempt.share_link?.token || null,
      feedbackSettings: {
        showCorrectAnswers: false,
        showAiFeedback: false,
        showResults: true,
      },
      guidanceNote,
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
