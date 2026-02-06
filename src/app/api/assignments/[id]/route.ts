import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
