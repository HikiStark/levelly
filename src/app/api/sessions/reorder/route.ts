import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/sessions/reorder - Reorder sessions
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
    const { assignmentId, sessionIds } = body

    if (!assignmentId || !sessionIds || !Array.isArray(sessionIds)) {
      return NextResponse.json(
        { error: 'assignmentId and sessionIds array are required' },
        { status: 400 }
      )
    }

    // Verify teacher owns this assignment
    const { data: assignment } = await supabase
      .from('assignment')
      .select('teacher_id')
      .eq('id', assignmentId)
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

    // Verify all session IDs belong to this assignment
    const { data: sessions } = await supabase
      .from('session')
      .select('id')
      .eq('assignment_id', assignmentId)

    const existingIds = new Set(sessions?.map(s => s.id) || [])
    const allValid = sessionIds.every((id: string) => existingIds.has(id))

    if (!allValid || sessionIds.length !== existingIds.size) {
      return NextResponse.json(
        { error: 'Invalid session IDs' },
        { status: 400 }
      )
    }

    // Update order_index for each session
    for (let i = 0; i < sessionIds.length; i++) {
      const { error: updateError } = await supabase
        .from('session')
        .update({ order_index: i })
        .eq('id', sessionIds[i])

      if (updateError) {
        console.error('Error updating session order:', updateError)
        return NextResponse.json(
          { error: 'Failed to reorder sessions' },
          { status: 500 }
        )
      }
    }

    // Fetch updated sessions
    const { data: updatedSessions, error: fetchError } = await supabase
      .from('session')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('order_index', { ascending: true })

    if (fetchError) {
      console.error('Error fetching updated sessions:', fetchError)
      return NextResponse.json(
        { error: 'Sessions reordered but failed to fetch updated list' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions: updatedSessions })
  } catch (error) {
    console.error('Error in POST /api/sessions/reorder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
