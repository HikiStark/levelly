import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Attempt } from '@/lib/supabase/types'
import { deleteAttempt, verifyTeacherOwnership } from '@/lib/grading/regrade'

interface AttemptWithRelations extends Attempt {
  assignment: { title: string } | null
  answer: Array<{
    id: string
    question_id: string
    selected_choice: string | null
    answer_text: string | null
    is_correct: boolean | null
    score: number | null
    ai_feedback: string | null
    question: { prompt: string; type: string; points: number; order_index: number } | null
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('attempt')
      .select(`
        *,
        assignment(title),
        answer(
          *,
          question(prompt, type, points, order_index)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    const attempt = data as unknown as AttemptWithRelations

    // Get redirect URL if final
    let redirectUrl: string | null = null
    if (attempt.is_final && attempt.level) {
      const { data: redirect } = await supabase
        .from('level_redirect')
        .select('redirect_url')
        .eq('assignment_id', attempt.assignment_id)
        .eq('level', attempt.level)
        .single()

      redirectUrl = (redirect as { redirect_url: string } | null)?.redirect_url || null
    }

    return NextResponse.json({
      attempt,
      redirectUrl,
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
