'use client'

import { Session } from '@/lib/supabase/types'

interface SessionProgressBarProps {
  sessions: Session[]
  currentIndex: number
}

export function SessionProgressBar({ sessions, currentIndex }: SessionProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {sessions.map((session, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const color = isCompleted
            ? 'bg-green-500'
            : isCurrent
            ? 'bg-blue-500'
            : 'bg-gray-300'

          return (
            <div key={session.id} className="flex-1">
              <div className={`h-2 rounded-full ${color}`} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Session {Math.min(currentIndex + 1, sessions.length)} of {sessions.length}</span>
        <span>{sessions[currentIndex]?.title || ''}</span>
      </div>
    </div>
  )
}
