import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/sessions/[id] - Get a single session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('session')
      .select('*, questions:question(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sessions/[id] - Update a session
export async function PUT(
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

    // Get the session to find its assignment
    const { data: session, error: sessionError } = await supabase
      .from('session')
      .select('assignment_id')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify teacher owns this assignment
    const { data: assignment } = await supabase
      .from('assignment')
      .select('teacher_id')
      .eq('id', session.assignment_id)
      .single()

    const { data: teacher } = await supabase
      .from('teacher')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacher || !assignment || teacher.id !== assignment.teacher_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description } = body

    const updateData: { title?: string; description?: string | null } = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description

    const { data: updatedSession, error: updateError } = await supabase
      .from('session')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Error in PUT /api/sessions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete a session
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

    // Get the session to find its assignment and order_index
    const { data: session, error: sessionError } = await supabase
      .from('session')
      .select('assignment_id, order_index')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify teacher owns this assignment
    const { data: assignment } = await supabase
      .from('assignment')
      .select('teacher_id')
      .eq('id', session.assignment_id)
      .single()

    const { data: teacher } = await supabase
      .from('teacher')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacher || !assignment || teacher.id !== assignment.teacher_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete the session (questions will have session_id set to null due to ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from('session')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      )
    }

    // Reorder remaining sessions to fill the gap
    const { data: remainingSessions } = await supabase
      .from('session')
      .select('id, order_index')
      .eq('assignment_id', session.assignment_id)
      .gt('order_index', session.order_index)
      .order('order_index', { ascending: true })

    if (remainingSessions && remainingSessions.length > 0) {
      for (const s of remainingSessions) {
        await supabase
          .from('session')
          .update({ order_index: s.order_index - 1 })
          .eq('id', s.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
