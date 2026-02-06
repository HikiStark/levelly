import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TeacherDashboard() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teacher } = await supabase
    .from('teacher')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: assignments } = await supabase
    .from('assignment')
    .select('*, question(count)')
    .eq('teacher_id', teacher?.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Link href="/teacher/assignments/new">
          <Button>{t('createQuiz')}</Button>
        </Link>
      </div>

      {!assignments || assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">{t('empty')}</p>
            <Link href="/teacher/assignments/new">
              <Button>{t('createFirst')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <Link key={assignment.id} href={`/teacher/assignments/${assignment.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <Badge
                      variant={assignment.status === 'published' ? 'default' : 'secondary'}
                    >
                      {assignment.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {assignment.description || t('noDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    {t('questions', { count: (assignment.question as { count: number }[])?.[0]?.count || 0 })}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {t('created', { date: new Date(assignment.created_at).toLocaleDateString() })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
