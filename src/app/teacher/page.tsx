import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TeacherDashboard() {
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
          <h1 className="text-2xl font-bold text-gray-900">Your Quizzes</h1>
          <p className="text-gray-600">Create and manage your leveling quizzes</p>
        </div>
        <Link href="/teacher/assignments/new">
          <Button>Create Quiz</Button>
        </Link>
      </div>

      {!assignments || assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t created any quizzes yet.</p>
            <Link href="/teacher/assignments/new">
              <Button>Create your first quiz</Button>
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
                    {assignment.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    {(assignment.question as { count: number }[])?.[0]?.count || 0} questions
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created {new Date(assignment.created_at).toLocaleDateString()}
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
