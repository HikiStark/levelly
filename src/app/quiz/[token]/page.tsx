import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { QuizContainer } from './quiz-container'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Find the share link
  const { data: shareLink, error: shareLinkError } = await supabase
    .from('share_link')
    .select('*, assignment(*)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  // Debug logging
  console.log('Token:', token)
  console.log('Share link error:', shareLinkError)
  console.log('Share link data:', shareLink)

  if (!shareLink || !shareLink.assignment) {
    notFound()
  }

  const assignment = shareLink.assignment as {
    id: string
    title: string
    description: string | null
    status: string
  }

  // Check if assignment is published
  if (assignment.status !== 'published') {
    const t = await getTranslations('quiz')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('notAvailableTitle')}</h1>
          <p className="text-gray-600">{t('notAvailable')}</p>
        </div>
      </div>
    )
  }

  return (
    <QuizContainer
      assignment={{
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
      }}
      shareLinkId={shareLink.id}
      token={token}
    />
  )
}
