import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/sessions?assignmentId=xxx - Get all sessions for an assignment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('session')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions: data })
  } catch (error) {
    console.error('Error in GET /api/sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { assignmentId, title, description } = body

    if (!assignmentId || !title) {
      return NextResponse.json(
        { error: 'assignmentId and title are required' },
        { status: 400 }
      )
    }

    // Verify teacher owns this assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment')
      .select('id, teacher_id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify the user is the teacher
    const { data: teacher } = await supabase
      .from('teacher')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacher || teacher.id !== assignment.teacher_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get the next order_index
    const { data: existingSessions } = await supabase
      .from('session')
      .select('order_index')
      .eq('assignment_id', assignmentId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingSessions && existingSessions.length > 0
      ? existingSessions[0].order_index + 1
      : 0

    // Create the session
    const { data: session, error: insertError } = await supabase
      .from('session')
      .insert({
        assignment_id: assignmentId,
        title,
        description: description || null,
        order_index: nextOrderIndex,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
