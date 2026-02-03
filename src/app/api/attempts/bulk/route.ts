import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteAttempt, regradeAttempt, verifyTeacherOwnership } from '@/lib/grading/regrade'

interface BulkRequest {
  action: 'delete' | 'regrade'
  attemptIds: string[]
  assignmentId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkRequest = await request.json()
    const { action, attemptIds, assignmentId } = body

    if (!action || !attemptIds || !assignmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['delete', 'regrade'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    if (!Array.isArray(attemptIds) || attemptIds.length === 0) {
      return NextResponse.json(
        { error: 'No attempts specified' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify teacher owns this assignment
    const { authorized, error: authzError } = await verifyTeacherOwnership(
      assignmentId,
      user.id
    )

    if (!authorized) {
      return NextResponse.json(
        { error: authzError || 'Forbidden' },
        { status: 403 }
      )
    }

    // Verify all attempts belong to this assignment
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('attempt')
      .select('id')
      .eq('assignment_id', assignmentId)
      .in('id', attemptIds)

    if (attemptsError) {
      return NextResponse.json(
        { error: 'Failed to verify attempts' },
        { status: 500 }
      )
    }

    const attempts = (attemptsData || []) as { id: string }[]
    const validAttemptIds = attempts.map(a => a.id)
    const invalidIds = attemptIds.filter(id => !validAttemptIds.includes(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Some attempts do not belong to this assignment: ${invalidIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Process the action
    const results: { id: string; success: boolean; error?: string }[] = []

    if (action === 'delete') {
      for (const attemptId of attemptIds) {
        const result = await deleteAttempt(attemptId)
        results.push({ id: attemptId, ...result })
      }
    } else if (action === 'regrade') {
      // For regrade, we process them but don't wait for background grading to complete
      for (const attemptId of attemptIds) {
        const result = await regradeAttempt(attemptId)
        results.push({ id: attemptId, ...result })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failedCount === 0,
      processed: attemptIds.length,
      succeeded: successCount,
      failed: failedCount,
      results,
    })
  } catch (error) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
