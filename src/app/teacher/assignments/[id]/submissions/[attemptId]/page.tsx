import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getLevelDisplayName, getLevelColor, Level } from '@/lib/grading/level-calculator'
import { SubmissionActions } from './submission-actions'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>
}) {
  const { id, attemptId } = await params
  const supabase = await createClient()

  // Fetch assignment to verify it exists and for context
  const { data: assignment } = await supabase
    .from('assignment')
    .select('*')
    .eq('id', id)
    .single()

  if (!assignment) {
    notFound()
  }

  // Fetch attempt with all answers and questions
  const { data: attempt } = await supabase
    .from('attempt')
    .select(`
      *,
      answer(
        *,
        question(*)
      )
    `)
    .eq('id', attemptId)
    .eq('assignment_id', id)
    .single()

  if (!attempt) {
    notFound()
  }

  const percentage = attempt.max_score > 0
    ? Math.round((attempt.total_score / attempt.max_score) * 100)
    : 0

  // Sort answers by question order
  const sortedAnswers = [...(attempt.answer || [])].sort(
    (a, b) => (a.question?.order_index || 0) - (b.question?.order_index || 0)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Submission</h1>
          <p className="text-gray-600">{assignment.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <SubmissionActions attemptId={attemptId} assignmentId={id} />
          <Link href={`/teacher/assignments/${id}/submissions`}>
            <Button variant="outline">Back to Submissions</Button>
          </Link>
        </div>
      </div>

      {/* Student Info & Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            {attempt.student_name || 'Anonymous Student'}
          </CardTitle>
          <CardDescription>
            {attempt.student_email || 'No email provided'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Grading Status */}
          {!attempt.is_final && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-md flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
              <span className="text-yellow-800">
                AI is still grading open-ended answers...
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            {/* Level */}
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500 mb-2">Level</p>
              {attempt.level ? (
                <Badge
                  className={`${getLevelColor(attempt.level as Level)} text-white px-4 py-1`}
                >
                  {getLevelDisplayName(attempt.level as Level)}
                </Badge>
              ) : (
                <span className="text-gray-400">Pending</span>
              )}
              {!attempt.is_final && (
                <p className="text-xs text-gray-400 mt-1">(Provisional)</p>
              )}
            </div>

            {/* Total Score */}
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500 mb-1">Total Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {attempt.total_score}/{attempt.max_score}
              </p>
              <p className="text-sm text-gray-500">{percentage}%</p>
            </div>

            {/* MCQ Score */}
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500 mb-1">MCQ</p>
              <p className="text-2xl font-bold text-gray-900">
                {attempt.mcq_score}/{attempt.mcq_total}
              </p>
            </div>

            {/* Open Score */}
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500 mb-1">Open-ended</p>
              <p className="text-2xl font-bold text-gray-900">
                {attempt.is_final ? (
                  <>{attempt.open_score}/{attempt.open_total}</>
                ) : (
                  <span className="text-base">Grading...</span>
                )}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Started:</span>{' '}
              <span className="text-gray-900">{formatDate(attempt.started_at)}</span>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>{' '}
              <span className="text-gray-900">{formatDate(attempt.submitted_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Answers</CardTitle>
          <CardDescription>
            Review each question and the student's response
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedAnswers.map((answer, index) => {
            const question = answer.question
            if (!question) return null

            const isMcq = question.type === 'mcq'
            const isCorrect = isMcq ? answer.is_correct : (answer.score === question.points)
            const isPartial = !isMcq && answer.score !== null && answer.score > 0 && answer.score < question.points

            return (
              <div
                key={answer.id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Question Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {isMcq ? 'MCQ' : 'Open-ended'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {question.points} point{question.points !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="font-medium">
                      Q{index + 1}: {question.prompt}
                    </p>
                  </div>
                  <Badge
                    variant={isCorrect ? 'default' : isPartial ? 'secondary' : 'destructive'}
                  >
                    {answer.score ?? 0}/{question.points}
                  </Badge>
                </div>

                {/* MCQ Answer */}
                {isMcq && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                    {/* Show all choices */}
                    {question.choices && (
                      <div className="space-y-1">
                        {question.choices.map((choice: { id: string; text: string }) => {
                          const isSelected = answer.selected_choice === choice.id
                          const isCorrectChoice = question.correct_choice === choice.id

                          return (
                            <div
                              key={choice.id}
                              className={`p-2 rounded text-sm flex items-center gap-2 ${
                                isSelected && isCorrectChoice
                                  ? 'bg-green-50 border border-green-200'
                                  : isSelected && !isCorrectChoice
                                  ? 'bg-red-50 border border-red-200'
                                  : isCorrectChoice
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <span className="font-medium uppercase">{choice.id}.</span>
                              <span className="flex-1">{choice.text}</span>
                              {isSelected && (
                                <span className={isCorrectChoice ? 'text-green-600' : 'text-red-600'}>
                                  {isCorrectChoice ? '✓ Student answer (Correct)' : '✗ Student answer'}
                                </span>
                              )}
                              {!isSelected && isCorrectChoice && (
                                <span className="text-green-600">✓ Correct answer</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {!answer.selected_choice && (
                      <p className="text-sm text-gray-500 italic">No answer provided</p>
                    )}
                  </div>
                )}

                {/* Open-ended Answer */}
                {!isMcq && (
                  <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                    {/* Student's Answer */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Student's Answer:</p>
                      <div className="p-3 bg-gray-50 rounded text-sm">
                        {answer.answer_text || (
                          <span className="text-gray-400 italic">No answer provided</span>
                        )}
                      </div>
                    </div>

                    {/* Reference Answer */}
                    {question.reference_answer && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Reference Answer:</p>
                        <div className="p-3 bg-blue-50 rounded text-sm text-blue-900">
                          {question.reference_answer}
                        </div>
                      </div>
                    )}

                    {/* AI Feedback */}
                    {answer.ai_feedback && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">AI Feedback:</p>
                        <div className="p-3 bg-purple-50 rounded text-sm text-purple-900">
                          {answer.ai_feedback}
                        </div>
                      </div>
                    )}

                    {/* Rubric (if available) */}
                    {question.rubric && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Grading Rubric:</p>
                        <div className="p-3 bg-gray-100 rounded text-sm text-gray-700">
                          {question.rubric}
                        </div>
                      </div>
                    )}

                    {/* Still grading indicator */}
                    {!attempt.is_final && answer.score === null && (
                      <div className="flex items-center gap-2 text-sm text-yellow-700">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        <span>AI grading in progress...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {sortedAnswers.length === 0 && (
            <p className="text-center text-gray-500 py-8">No answers recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
