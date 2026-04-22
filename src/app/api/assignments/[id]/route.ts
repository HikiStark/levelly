import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyTeacherOwnsAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
  userId: string
) {
  const { data: teacher } = await supabase
    .from('teacher')
    .select('id')
    .eq('user_id', userId)
    .single()

  const { data: assignment } = await supabase
    .from('assignment')
    .select('teacher_id')
    .eq('id', assignmentId)
    .single()

  return {
    authorized: Boolean(teacher && assignment && teacher.id === assignment.teacher_id),
  }
}

// PATCH /api/assignments/[id] - Update assignment metadata or settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { authorized } = await verifyTeacherOwnsAssignment(supabase, id, user.id)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.title === 'string') {
      const trimmed = body.title.trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      }
      updates.title = trimmed
    }
    if ('description' in body) {
      updates.description =
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null
    }
    if ('guidance_note' in body) {
      updates.guidance_note =
        typeof body.guidance_note === 'string' && body.guidance_note.trim()
          ? body.guidance_note.trim()
          : null
    }
    if (typeof body.show_results === 'boolean') updates.show_results = body.show_results
    if (typeof body.show_correct_answers === 'boolean') updates.show_correct_answers = body.show_correct_answers
    if (typeof body.show_ai_feedback === 'boolean') updates.show_ai_feedback = body.show_ai_feedback

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assignment')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      // Postgres undefined_column = 42703. Surface a specific, actionable error so the
      // teacher immediately sees that migration 010 hasn't been applied.
      const code = (error as { code?: string }).code
      if (code === '42703') {
        return NextResponse.json(
          {
            error: 'Database schema is missing required columns. Apply migration 010_levelly_fixes_and_features.sql to your Supabase database, then try again.',
            code: 'missing_column',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message || 'Failed to update assignment' }, { status: 500 })
    }

    return NextResponse.json({ assignment: data })
  } catch (error) {
    console.error('Error in PATCH /api/assignments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/assignments/[id] - Delete an assignment and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify teacher owns this assignment
    const { data: teacher } = await supabase
      .from('teacher')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const { data: assignment } = await supabase
      .from('assignment')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (!teacher || !assignment || teacher.id !== assignment.teacher_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete the assignment — CASCADE handles all children
    const { error: deleteError } = await supabase
      .from('assignment')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/assignments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
