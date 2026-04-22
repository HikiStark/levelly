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
import { SessionManager } from './session-manager'
import { DeleteQuizButton } from './delete-quiz-button'
import { EditDetailsDialog } from './edit-details-dialog'
import { GuidanceNoteSection } from './guidance-note-section'

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('assignment')
  const tg = await getTranslations('guidance')
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('assignment')
    .select('*')
    .eq('id', id)
    .single()

  if (!assignment) {
    notFound()
  }

  // Detect whether migration 010 is applied — without the column the
  // show_results toggle cannot work and we should warn the teacher up front.
  const migrationApplied = Object.prototype.hasOwnProperty.call(assignment, 'show_results')

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
      {!migrationApplied && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Database migration required</p>
          <p>
            Some features (hide results, guidance notes, student demographics, Likert questions) rely on
            <code className="mx-1 rounded bg-amber-100 px-1">supabase/migrations/010_levelly_fixes_and_features.sql</code>
            which has not been applied yet. Apply it in your Supabase SQL editor or via <code className="mx-1 rounded bg-amber-100 px-1">supabase db push</code>, then reload this page.
          </p>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <Badge variant={assignment.status === 'published' ? 'default' : 'secondary'}>
              {assignment.status}
            </Badge>
            <EditDetailsDialog
              assignmentId={id}
              initialTitle={assignment.title}
              initialDescription={assignment.description}
            />
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

      {/* Guidance Message (shown to students after submitting) */}
      <Card>
        <CardHeader>
          <CardTitle>{tg('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <GuidanceNoteSection
            assignmentId={id}
            initialNote={assignment.guidance_note ?? null}
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
