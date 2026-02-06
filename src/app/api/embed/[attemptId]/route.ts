import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params
    const supabase = await createClient()

    // Get attempt with assignment info
    const { data: attempt, error: attemptError } = await supabase
      .from('attempt')
      .select(`
        id,
        assignment_id,
        session_id,
        level,
        is_final,
        assignment(title)
      `)
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    // Must be final to access embed
    if (!attempt.is_final) {
      return NextResponse.json(
        { error: 'Results not yet finalized' },
        { status: 400 }
      )
    }

    if (!attempt.level) {
      return NextResponse.json(
        { error: 'No level assigned' },
        { status: 400 }
      )
    }

    // Get level redirect with embed content
    let redirectQuery = supabase
      .from('level_redirect')
      .select('*')
      .eq('assignment_id', attempt.assignment_id)
      .eq('level', attempt.level)

    if (attempt.session_id) {
      redirectQuery = redirectQuery.eq('session_id', attempt.session_id)
    } else {
      redirectQuery = redirectQuery.is('session_id', null)
    }

    const { data: redirect, error: redirectError } = await redirectQuery.single()

    if (redirectError || !redirect) {
      return NextResponse.json(
        { error: 'No content configured for this level' },
        { status: 404 }
      )
    }

    // Check if it's embed type
    if (redirect.redirect_type !== 'embed' || !redirect.embed_code) {
      return NextResponse.json(
        { error: 'No embedded content configured for this level' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      embedCode: redirect.embed_code,
      level: attempt.level,
      assignmentTitle: (attempt.assignment as { title: string } | null)?.title || 'Quiz',
    })
  } catch (error) {
    console.error('Error fetching embed content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
