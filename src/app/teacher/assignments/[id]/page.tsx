import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuestionsSection } from './questions-section'
import { ShareLinkSection } from './share-link-section'
import { LevelRedirectSection } from './level-redirect-section'
import { PublishButton } from './publish-button'
import { FeedbackSettingsSection } from './feedback-settings-section'
import { SessionManager } from './session-manager'
import { DeleteQuizButton } from './delete-quiz-button'

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('assignment')
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
          <p className="text-gray-600">{assignment.description || t('noDescription')}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/teacher">
            <Button variant="outline">{t('backToDashboard')}</Button>
          </Link>
          <Link href={`/teacher/assignments/${id}/submissions`}>
            <Button variant="outline">{t('viewSubmissions')}</Button>
          </Link>
          <DeleteQuizButton assignmentId={id} assignmentTitle={assignment.title} />
          <PublishButton assignment={assignment} questionCount={questions?.length || 0} />
        </div>
      </div>

      {/* Sessions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.sessions')}</CardTitle>
          <CardDescription>
            {t('sections.sessionsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionManager assignmentId={id} questions={questions || []} />
        </CardContent>
      </Card>

      {/* Questions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('sections.questions')}</CardTitle>
            <CardDescription>
              {t('sections.questionsDescription')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <QuestionsSection questions={questions || []} assignmentId={id} />
        </CardContent>
      </Card>

      {/* Level Redirects */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.levelRedirects')}</CardTitle>
          <CardDescription>
            {t('sections.levelRedirectsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LevelRedirectSection assignmentId={id} redirects={redirects || []} />
        </CardContent>
      </Card>

      {/* Student Feedback Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.feedbackSettings')}</CardTitle>
          <CardDescription>
            {t('sections.feedbackSettingsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackSettingsSection
            assignmentId={id}
            showCorrectAnswers={assignment.show_correct_answers ?? true}
            showAiFeedback={assignment.show_ai_feedback ?? true}
          />
        </CardContent>
      </Card>

      {/* Share Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.shareLinks')}</CardTitle>
          <CardDescription>
            {t('sections.shareLinksDescription')}
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
