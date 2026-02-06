import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/journey - Start a new student journey
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { assignmentId, shareLinkId, studentName, studentEmail } = body

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId is required' },
        { status: 400 }
      )
    }

    // Verify assignment exists and is published
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment')
      .select('id, status')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    if (assignment.status !== 'published') {
      return NextResponse.json(
        { error: 'Assignment is not published' },
        { status: 400 }
      )
    }

    // Get sessions for this assignment
    const { data: sessions, error: sessionsError } = await supabase
      .from('session')
      .select('id, title, order_index, description')
      .eq('assignment_id', assignmentId)
      .order('order_index', { ascending: true })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Create the student journey
    const { data: journey, error: journeyError } = await supabase
      .from('student_journey')
      .insert({
        assignment_id: assignmentId,
        share_link_id: shareLinkId || null,
        student_name: studentName || null,
        student_email: studentEmail || null,
        current_session_index: 0,
        overall_status: 'in_progress',
        total_score: 0,
        max_score: 0,
      })
      .select()
      .single()

    if (journeyError) {
      console.error('Error creating journey:', journeyError)
      return NextResponse.json(
        { error: 'Failed to create journey' },
        { status: 500 }
      )
    }

    // Get the first session ID (if sessions exist)
    const firstSessionId = sessions && sessions.length > 0 ? sessions[0].id : null

    return NextResponse.json({
      journeyId: journey.id,
      firstSessionId,
      sessions: sessions || [],
      totalSessions: sessions?.length || 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/journey:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
