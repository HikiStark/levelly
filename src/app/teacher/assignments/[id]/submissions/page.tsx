import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function getLevelBadgeVariant(level: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'advanced':
      return 'default'
    case 'intermediate':
      return 'secondary'
    case 'beginner':
      return 'outline'
    default:
      return 'secondary'
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'graded':
      return 'default'
    case 'submitted':
      return 'secondary'
    case 'in_progress':
      return 'outline'
    default:
      return 'secondary'
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

export default async function SubmissionsPage({
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

  const { data: attempts } = await supabase
    .from('attempt')
    .select('*')
    .eq('assignment_id', id)
    .order('submitted_at', { ascending: false })

  const submittedAttempts = attempts?.filter(a => a.status !== 'in_progress') || []
  const inProgressAttempts = attempts?.filter(a => a.status === 'in_progress') || []

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Submissions</h1>
          <p className="text-gray-600">{assignment.title}</p>
        </div>
        <Link href={`/teacher/assignments/${id}`}>
          <Button variant="outline">Back to Assignment</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Submissions</CardDescription>
            <CardTitle className="text-3xl">{submittedAttempts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Advanced</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {submittedAttempts.filter(a => a.level === 'advanced').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Intermediate</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {submittedAttempts.filter(a => a.level === 'intermediate').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Beginner</CardDescription>
            <CardTitle className="text-3xl text-gray-600">
              {submittedAttempts.filter(a => a.level === 'beginner').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Submitted Attempts */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Responses</CardTitle>
          <CardDescription>
            View all student submissions and their answers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submittedAttempts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No submissions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{attempt.student_name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{attempt.student_email || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(attempt.submitted_at)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(attempt.status)}>
                        {attempt.is_final ? 'Graded' : attempt.status === 'submitted' ? 'Grading...' : attempt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{attempt.total_score}</span>
                      <span className="text-gray-500">/{attempt.max_score}</span>
                      <span className="text-gray-400 text-sm ml-1">
                        ({attempt.max_score > 0 ? Math.round((attempt.total_score / attempt.max_score) * 100) : 0}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      {attempt.level ? (
                        <Badge variant={getLevelBadgeVariant(attempt.level)}>
                          {attempt.level}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/teacher/assignments/${id}/submissions/${attempt.id}`}>
                        <Button variant="outline" size="sm">
                          View Answers
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* In Progress Attempts */}
      {inProgressAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
            <CardDescription>
              Students who started but haven't submitted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inProgressAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{attempt.student_name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{attempt.student_email || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(attempt.started_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
