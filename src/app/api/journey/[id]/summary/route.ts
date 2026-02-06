import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateLevel } from '@/lib/grading/level-calculator'

// GET /api/journey/[id]/summary - Get overall journey results
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

    // Get the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment')
      .select('id, title, description')
      .eq('id', journey.assignment_id)
      .single()

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment' },
        { status: 500 }
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
      .select('id, session_id, total_score, max_score, level, is_final, mcq_score, mcq_total, open_score, open_total')
      .eq('journey_id', id)

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 }
      )
    }

    // Calculate overall scores
    let totalScore = 0
    let maxScore = 0

    // Build session results
    const sessionResults = sessions?.map(session => {
      const attempt = attempts?.find(a => a.session_id === session.id)

      if (attempt) {
        totalScore += attempt.total_score
        maxScore += attempt.max_score
      }

      return {
        session,
        attempt: attempt || null,
        score: attempt?.total_score ?? 0,
        maxScore: attempt?.max_score ?? 0,
        level: attempt?.level || null,
        isComplete: attempt?.is_final ?? false,
      }
    }) || []

    // Calculate overall level
    const overallLevel = calculateLevel(totalScore, maxScore)
    const overallPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

    // Get final redirect (if configured)
    let finalRedirect: { type: 'link' | 'embed'; url?: string; embedCode?: string } | null = null
    if (journey.overall_status === 'completed') {
      const { data: redirect } = await supabase
        .from('level_redirect')
        .select('redirect_type, redirect_url, embed_code')
        .eq('assignment_id', journey.assignment_id)
        .is('session_id', null) // Final redirect has no session_id
        .eq('level', overallLevel)
        .single()

      if (redirect) {
        finalRedirect = {
          type: redirect.redirect_type as 'link' | 'embed',
          url: redirect.redirect_url || undefined,
          embedCode: redirect.embed_code || undefined,
        }
      }
    }

    // Update journey with calculated totals if different
    if (journey.total_score !== totalScore || journey.max_score !== maxScore || journey.overall_level !== overallLevel) {
      await supabase
        .from('student_journey')
        .update({
          total_score: totalScore,
          max_score: maxScore,
          overall_level: overallLevel,
        })
        .eq('id', id)
    }

    return NextResponse.json({
      journey: {
        ...journey,
        total_score: totalScore,
        max_score: maxScore,
        overall_level: overallLevel,
      },
      assignment,
      sessionResults,
      summary: {
        totalScore,
        maxScore,
        percentage: overallPercentage,
        overallLevel,
        completedSessions: attempts?.filter(a => a.is_final).length || 0,
        totalSessions: sessions?.length || 0,
      },
      finalRedirect,
    })
  } catch (error) {
    console.error('Error in GET /api/journey/[id]/summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
