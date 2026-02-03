import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SubmitRequest {
  questionnaireId: string
  attemptId: string
  answers: Array<{
    questionId: string
    value: string | number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitRequest = await request.json()
    const { questionnaireId, attemptId, answers } = body

    if (!questionnaireId || !attemptId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if response already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingResponse } = await (supabase as any)
      .from('questionnaire_response')
      .select('id')
      .eq('questionnaire_id', questionnaireId)
      .eq('attempt_id', attemptId)
      .maybeSingle()

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already submitted this questionnaire' },
        { status: 400 }
      )
    }

    // Create the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: response, error: responseError } = await (supabase as any)
      .from('questionnaire_response')
      .insert({
        questionnaire_id: questionnaireId,
        attempt_id: attemptId,
      })
      .select()
      .single()

    if (responseError || !response) {
      console.error('Error creating response:', responseError)
      return NextResponse.json(
        { error: 'Failed to create response' },
        { status: 500 }
      )
    }

    // Get question types to properly store answers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questions } = await (supabase as any)
      .from('questionnaire_question')
      .select('id, type')
      .eq('questionnaire_id', questionnaireId)

    const questionTypeMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (questions || []).map((q: any) => [q.id, q.type])
    )

    // Create the answers
    const answerInserts = answers.map((answer) => {
      const type = questionTypeMap.get(answer.questionId)
      return {
        response_id: response.id,
        question_id: answer.questionId,
        answer_text: type === 'text' ? String(answer.value) : null,
        answer_rating: type === 'rating' ? Number(answer.value) : null,
        answer_choice: type === 'mcq' ? String(answer.value) : null,
      }
    })

    if (answerInserts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: answersError } = await (supabase as any)
        .from('questionnaire_answer')
        .insert(answerInserts)

      if (answersError) {
        console.error('Error creating answers:', answersError)
        return NextResponse.json(
          { error: 'Failed to save answers' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, responseId: response.id })
  } catch (error) {
    console.error('Error submitting questionnaire:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
