'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Assignment } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'

interface PublishButtonProps {
  assignment: Assignment
  questionCount: number
}

export function PublishButton({ assignment, questionCount }: PublishButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const togglePublish = async () => {
    if (assignment.status === 'draft' && questionCount === 0) {
      alert('Add at least one question before publishing.')
      return
    }

    setLoading(true)

    const newStatus = assignment.status === 'published' ? 'draft' : 'published'

    const { error } = await supabase
      .from('assignment')
      .update({ status: newStatus })
      .eq('id', assignment.id)

    if (error) {
      alert('Error updating status: ' + error.message)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <Button
      onClick={togglePublish}
      disabled={loading}
      variant={assignment.status === 'published' ? 'outline' : 'default'}
    >
      {loading
        ? 'Updating...'
        : assignment.status === 'published'
        ? 'Unpublish'
        : 'Publish'}
    </Button>
  )
}
