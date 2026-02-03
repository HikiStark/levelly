import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

interface QuestionnaireQuestion {
  id: string
  type: 'text' | 'rating' | 'mcq'
  prompt: string
  options: { id: string; text: string }[] | { min: number; max: number } | null
  order_index: number
}

interface QuestionnaireAnswer {
  id: string
  question_id: string
  answer_text: string | null
  answer_rating: number | null
  answer_choice: string | null
}

interface QuestionnaireResponse {
  id: string
  attempt_id: string
  submitted_at: string
  attempt: {
    student_name: string | null
    student_email: string | null
  }
  answers: QuestionnaireAnswer[]
}

export default async function QuestionnaireResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assignmentData } = await supabase
    .from('assignment')
    .select('*')
    .eq('id', id)
    .single()

  if (!assignmentData) {
    notFound()
  }

  // Cast to any to avoid type errors until types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignment = assignmentData as any

  // Get questionnaire
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: questionnaire } = await (supabase as any)
    .from('questionnaire')
    .select('*')
    .eq('assignment_id', id)
    .maybeSingle()

  if (!questionnaire) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Questionnaire Responses</h1>
            <p className="text-gray-600">{assignment.title}</p>
          </div>
          <Link href={`/teacher/assignments/${id}`}>
            <Button variant="outline">Back to Assignment</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No questionnaire has been created for this assignment.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get questionnaire questions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: questions } = await (supabase as any)
    .from('questionnaire_question')
    .select('*')
    .eq('questionnaire_id', questionnaire.id)
    .order('order_index', { ascending: true })

  const questionList: QuestionnaireQuestion[] = questions || []

  // Get responses with answers and attempt info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: responses } = await (supabase as any)
    .from('questionnaire_response')
    .select(`
      *,
      attempt:attempt_id(student_name, student_email),
      answers:questionnaire_answer(*)
    `)
    .eq('questionnaire_id', questionnaire.id)
    .order('submitted_at', { ascending: false })

  const responseList: QuestionnaireResponse[] = responses || []

  // Calculate stats for rating questions
  const ratingStats: Record<string, { sum: number; count: number; avg: number }> = {}
  for (const q of questionList.filter((q) => q.type === 'rating')) {
    let sum = 0
    let count = 0
    for (const r of responseList) {
      const answer = r.answers?.find((a: QuestionnaireAnswer) => a.question_id === q.id)
      if (answer?.answer_rating != null) {
        sum += answer.answer_rating
        count++
      }
    }
    ratingStats[q.id] = { sum, count, avg: count > 0 ? sum / count : 0 }
  }

  // Calculate stats for MCQ questions
  const mcqStats: Record<string, Record<string, number>> = {}
  for (const q of questionList.filter((q) => q.type === 'mcq')) {
    const choiceCounts: Record<string, number> = {}
    for (const r of responseList) {
      const answer = r.answers?.find((a: QuestionnaireAnswer) => a.question_id === q.id)
      if (answer?.answer_choice) {
        choiceCounts[answer.answer_choice] = (choiceCounts[answer.answer_choice] || 0) + 1
      }
    }
    mcqStats[q.id] = choiceCounts
  }

  // Get total attempts for response rate
  const { count: totalAttempts } = await supabase
    .from('attempt')
    .select('*', { count: 'exact', head: true })
    .eq('assignment_id', id)
    .eq('is_final', true)

  const responseRate = totalAttempts && totalAttempts > 0
    ? Math.round((responseList.length / totalAttempts) * 100)
    : 0

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaire Responses</h1>
          <p className="text-gray-600">{assignment.title}</p>
        </div>
        <Link href={`/teacher/assignments/${id}`}>
          <Button variant="outline">Back to Assignment</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle className="text-3xl">{responseList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Response Rate</CardDescription>
            <CardTitle className="text-3xl">{responseRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions</CardDescription>
            <CardTitle className="text-3xl">{questionList.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Question Summary */}
      {questionList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Summary</CardTitle>
            <CardDescription>
              Aggregated responses for each question
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionList.map((question, index) => (
              <div key={question.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Q{index + 1}</Badge>
                  <Badge variant="secondary">{question.type}</Badge>
                </div>
                <p className="font-medium mb-3">{question.prompt}</p>

                {question.type === 'rating' && ratingStats[question.id] && (
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-blue-600">
                      {ratingStats[question.id].avg.toFixed(1)}
                    </span>
                    <span className="text-gray-500">
                      average ({ratingStats[question.id].count} responses)
                    </span>
                  </div>
                )}

                {question.type === 'mcq' && mcqStats[question.id] && Array.isArray(question.options) && (
                  <div className="space-y-2">
                    {(question.options as { id: string; text: string }[]).map((option) => {
                      const count = mcqStats[question.id][option.id] || 0
                      const percent = responseList.length > 0
                        ? Math.round((count / responseList.length) * 100)
                        : 0
                      return (
                        <div key={option.id} className="flex items-center gap-2">
                          <div className="w-32 text-sm text-gray-600">{option.text}</div>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 w-16">
                            {count} ({percent}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {question.type === 'text' && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {responseList
                      .map((r) => r.answers?.find((a: QuestionnaireAnswer) => a.question_id === question.id))
                      .filter((a): a is QuestionnaireAnswer => a?.answer_text != null && a.answer_text.trim() !== '')
                      .map((answer, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                          {answer.answer_text}
                        </div>
                      ))}
                    {responseList.filter((r) => r.answers?.some((a: QuestionnaireAnswer) => a.question_id === question.id && a.answer_text)).length === 0 && (
                      <p className="text-gray-400 text-sm">No responses yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Individual Responses */}
      {responseList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Responses</CardTitle>
            <CardDescription>
              All submitted questionnaire responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted</TableHead>
                  {questionList.slice(0, 3).map((q, i) => (
                    <TableHead key={q.id} className="max-w-[200px] truncate">
                      Q{i + 1}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responseList.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{response.attempt?.student_name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{response.attempt?.student_email || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(response.submitted_at)}</TableCell>
                    {questionList.slice(0, 3).map((q) => {
                      const answer = response.answers?.find((a: QuestionnaireAnswer) => a.question_id === q.id)
                      let displayValue = '-'
                      if (q.type === 'rating' && answer?.answer_rating != null) {
                        displayValue = String(answer.answer_rating)
                      } else if (q.type === 'mcq' && answer?.answer_choice) {
                        const option = Array.isArray(q.options)
                          ? (q.options as { id: string; text: string }[]).find((o) => o.id === answer.answer_choice)
                          : null
                        displayValue = option?.text || answer.answer_choice
                      } else if (q.type === 'text' && answer?.answer_text) {
                        displayValue = answer.answer_text.length > 30
                          ? answer.answer_text.substring(0, 30) + '...'
                          : answer.answer_text
                      }
                      return (
                        <TableCell key={q.id} className="max-w-[200px] truncate">
                          {displayValue}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {responseList.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No responses yet. Responses will appear here once students complete the questionnaire.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
