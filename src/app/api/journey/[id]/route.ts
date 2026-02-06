import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/journey/[id] - Get journey status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the journey
    const { data: journey, error: journeyError } = await supabase
      .from('student_journey')
      .select('*')
      .eq('id', id)
      .single()

    if (journeyError || !journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }

    // Get all sessions for this assignment
    const { data: sessions, error: sessionsError } = await supabase
      .from('session')
      .select('id, title, order_index, description')
      .eq('assignment_id', journey.assignment_id)
      .order('order_index', { ascending: true })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Get all attempts for this journey
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempt')
      .select('id, session_id, total_score, max_score, level, is_final, status')
      .eq('journey_id', id)

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 }
      )
    }

    // Map attempts to sessions
    const sessionStatus = sessions?.map(session => {
      const attempt = attempts?.find(a => a.session_id === session.id)
      return {
        ...session,
        attempt: attempt || null,
        status: attempt?.is_final ? 'completed' : attempt ? 'in_progress' : 'locked',
      }
    }) || []

    // Get the current session
    const currentSession = sessions && sessions.length > journey.current_session_index
      ? sessions[journey.current_session_index]
      : null

    return NextResponse.json({
      journey,
      sessions: sessionStatus,
      currentSession,
      totalSessions: sessions?.length || 0,
      completedSessions: attempts?.filter(a => a.is_final).length || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/journey/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/journey/[id] - Update journey (advance to next session)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const body = await request.json()
    const { action } = body

    // Get the journey
    const { data: journey, error: journeyError } = await supabase
      .from('student_journey')
      .select('*')
      .eq('id', id)
      .single()

    if (journeyError || !journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }

    if (action === 'advance') {
      // Get all sessions
      const { data: sessions } = await supabase
        .from('session')
        .select('id, title, order_index')
        .eq('assignment_id', journey.assignment_id)
        .order('order_index', { ascending: true })

      const totalSessions = sessions?.length || 0
      const nextIndex = journey.current_session_index + 1

      if (nextIndex >= totalSessions) {
        // This was the last session, mark journey as completed
        const { data: updatedJourney, error: updateError } = await supabase
          .from('student_journey')
          .update({
            overall_status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (updateError) {
          console.error('Error completing journey:', updateError)
          return NextResponse.json(
            { error: 'Failed to complete journey' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          journey: updatedJourney,
          isComplete: true,
          nextSessionId: null,
        })
      }

      // Advance to next session
      const { data: updatedJourney, error: updateError } = await supabase
        .from('student_journey')
        .update({ current_session_index: nextIndex })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error advancing journey:', updateError)
        return NextResponse.json(
          { error: 'Failed to advance journey' },
          { status: 500 }
        )
      }

      const nextSession = sessions?.[nextIndex]

      return NextResponse.json({
        journey: updatedJourney,
        isComplete: false,
        nextSessionId: nextSession?.id || null,
        nextSessionTitle: nextSession?.title || null,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in PUT /api/journey/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
