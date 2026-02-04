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
    const { data: redirect, error: redirectError } = await supabase
      .from('level_redirect')
      .select('*')
      .eq('assignment_id', attempt.assignment_id)
      .eq('level', attempt.level)
      .single()

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

    // Check questionnaire status
    let hasQuestionnaire = false
    let questionnaireSubmitted = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questionnaire } = await (supabase as any)
      .from('questionnaire')
      .select('id')
      .eq('assignment_id', attempt.assignment_id)
      .eq('is_enabled', true)
      .maybeSingle()

    if (questionnaire) {
      hasQuestionnaire = true

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response } = await (supabase as any)
        .from('questionnaire_response')
        .select('id')
        .eq('questionnaire_id', questionnaire.id)
        .eq('attempt_id', attemptId)
        .maybeSingle()

      questionnaireSubmitted = !!response
    }

    return NextResponse.json({
      embedCode: redirect.embed_code,
      level: attempt.level,
      assignmentTitle: (attempt.assignment as { title: string } | null)?.title || 'Quiz',
      hasQuestionnaire,
      questionnaireSubmitted,
    })
  } catch (error) {
    console.error('Error fetching embed content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
