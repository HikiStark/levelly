'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewAssignmentPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations('newQuiz')
  const tCommon = useTranslations('common')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { data: teacher } = await supabase
      .from('teacher')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacher) {
      setError('Teacher profile not found')
      setLoading(false)
      return
    }

    const { data: assignment, error: insertError } = await supabase
      .from('assignment')
      .insert({
        teacher_id: teacher.id,
        title,
        description: description || null,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    const { error: sessionError } = await supabase
      .from('session')
      .insert({
        assignment_id: assignment.id,
        title: 'Session 1',
        description: 'Default starting session',
        order_index: 0,
      })

    if (sessionError) {
      setError(`Quiz created, but failed to create default session: ${sessionError.message}`)
      setLoading(false)
      return
    }

    router.push(`/teacher/assignments/${assignment.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">{t('quizTitle')}</Label>
              <Input
                id="title"
                placeholder={t('titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('quizDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? tCommon('creating') : t('create')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {t('cancel')}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
