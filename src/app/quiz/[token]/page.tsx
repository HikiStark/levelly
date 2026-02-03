import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Available</h1>
          <p className="text-gray-600">This quiz is not currently available.</p>
        </div>
      </div>
    )
  }

  // Get questions
  const { data: questions } = await supabase
    .from('question')
    .select('*')
    .eq('assignment_id', assignment.id)
    .order('order_index', { ascending: true })

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Questions</h1>
          <p className="text-gray-600">This quiz has no questions yet.</p>
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
      questions={questions}
      shareLinkId={shareLink.id}
    />
  )
}
