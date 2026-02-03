import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regradeAttempt, verifyTeacherOwnership } from '@/lib/grading/regrade'

export async function POST(
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

    // Start regrading
    const { success, error, backgroundWork } = await regradeAttempt(id)

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to regrade attempt' },
        { status: 500 }
      )
    }

    // If there's background work (open questions to grade), run it with after()
    if (backgroundWork) {
      after(async () => {
        try {
          await backgroundWork()
        } catch (err) {
          console.error(`[Regrade] Background grading failed for attempt ${id}:`, err)
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Regrading started'
    })
  } catch (error) {
    console.error('Error regrading attempt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
