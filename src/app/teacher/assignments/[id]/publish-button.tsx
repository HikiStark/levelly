'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('assignment')
  const supabase = createClient()

  const togglePublish = async () => {
    if (assignment.status === 'draft' && questionCount === 0) {
      alert(t('addQuestionFirst'))
      return
    }

    setLoading(true)

    const newStatus = assignment.status === 'published' ? 'draft' : 'published'

    const { error } = await supabase
      .from('assignment')
      .update({ status: newStatus })
      .eq('id', assignment.id)

    if (error) {
      alert(`${t('errorUpdatingStatus')}: ${error.message}`)
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
        ? t('updating')
        : assignment.status === 'published'
        ? t('unpublish')
        : t('publish')}
    </Button>
  )
}
