import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuestionList } from './question-list'
import { AddQuestionDialog } from './add-question-dialog'
import { ImageMapEditor } from './image-map-editor'
import { ShareLinkSection } from './share-link-section'
import { LevelRedirectSection } from './level-redirect-section'
import { PublishButton } from './publish-button'
import { QuestionnaireSection } from './questionnaire-section'

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('assignment')
    .select('*')
    .eq('id', id)
    .single()

  if (!assignment) {
    notFound()
  }

  const { data: questions } = await supabase
    .from('question')
    .select('*')
    .eq('assignment_id', id)
    .order('order_index', { ascending: true })

  const { data: shareLinks } = await supabase
    .from('share_link')
    .select('*')
    .eq('assignment_id', id)
    .eq('is_active', true)

  const { data: redirects } = await supabase
    .from('level_redirect')
    .select('*')
    .eq('assignment_id', id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: questionnaire } = await (supabase as any)
    .from('questionnaire')
    .select('*')
    .eq('assignment_id', id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let questionnaireQuestions: any[] = []
  if (questionnaire) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('questionnaire_question')
      .select('*')
      .eq('questionnaire_id', questionnaire.id)
      .order('order_index', { ascending: true })
    questionnaireQuestions = data || []
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <Badge variant={assignment.status === 'published' ? 'default' : 'secondary'}>
              {assignment.status}
            </Badge>
          </div>
          <p className="text-gray-600">{assignment.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/teacher">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Link href={`/teacher/assignments/${id}/submissions`}>
            <Button variant="outline">View Submissions</Button>
          </Link>
          <PublishButton assignment={assignment} questionCount={questions?.length || 0} />
        </div>
      </div>

      {/* Questions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Add MCQ, open-ended, slider, or image map questions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <AddQuestionDialog
              assignmentId={id}
              nextOrderIndex={(questions?.length || 0) + 1}
            />
            <ImageMapEditor
              assignmentId={id}
              nextOrderIndex={(questions?.length || 0) + 1}
            />
          </div>
        </CardHeader>
        <CardContent>
          <QuestionList questions={questions || []} assignmentId={id} />
        </CardContent>
      </Card>

      {/* Level Redirects */}
      <Card>
        <CardHeader>
          <CardTitle>Level Redirects</CardTitle>
          <CardDescription>
            Configure where to redirect students based on their level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LevelRedirectSection assignmentId={id} redirects={redirects || []} />
        </CardContent>
      </Card>

      {/* Student Questionnaire */}
      <Card>
        <CardHeader>
          <CardTitle>Student Questionnaire</CardTitle>
          <CardDescription>
            Optional feedback form shown to students after they see their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionnaireSection
            assignmentId={id}
            questionnaire={questionnaire}
            questions={questionnaireQuestions}
          />
        </CardContent>
      </Card>

      {/* Share Links */}
      <Card>
        <CardHeader>
          <CardTitle>Share Links</CardTitle>
          <CardDescription>
            Generate links for students to access this quiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShareLinkSection
            assignmentId={id}
            shareLinks={shareLinks || []}
            isPublished={assignment.status === 'published'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
