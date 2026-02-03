import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Levelly
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Create leveling quizzes with AI-powered grading.
          Assess students and redirect them based on their level.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline">Create account</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
