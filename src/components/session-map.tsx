'use client'

import { Session } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'

interface SessionMapProps {
  sessions: Session[]
}

export function SessionMap({ sessions }: SessionMapProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Session Overview</h3>
          <p className="text-sm text-gray-500">
            You will complete the sessions in order. This map is for reference only.
          </p>
        </div>
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <div key={session.id} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{session.title}</p>
                {session.description && (
                  <p className="text-xs text-gray-500">{session.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
