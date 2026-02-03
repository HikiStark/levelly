'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LevelRedirect } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LevelRedirectSectionProps {
  assignmentId: string
  redirects: LevelRedirect[]
}

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export function LevelRedirectSection({ assignmentId, redirects }: LevelRedirectSectionProps) {
  const [urls, setUrls] = useState<Record<string, string>>({
    beginner: '',
    intermediate: '',
    advanced: '',
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const urlMap: Record<string, string> = {
      beginner: '',
      intermediate: '',
      advanced: '',
    }
    redirects.forEach((r) => {
      urlMap[r.level] = r.redirect_url
    })
    setUrls(urlMap)
  }, [redirects])

  const saveRedirects = async () => {
    setSaving(true)

    for (const level of LEVELS) {
      const url = urls[level].trim()
      const existing = redirects.find((r) => r.level === level)

      if (url) {
        if (existing) {
          await supabase
            .from('level_redirect')
            .update({ redirect_url: url })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('level_redirect')
            .insert({
              assignment_id: assignmentId,
              level,
              redirect_url: url,
            })
        }
      } else if (existing) {
        await supabase
          .from('level_redirect')
          .delete()
          .eq('id', existing.id)
      }
    }

    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Configure where students are redirected based on their level.
        Leave empty if no redirect is needed.
      </p>

      <div className="space-y-4">
        {LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-4">
            <Label className="w-28 capitalize font-medium">
              {level}
              <span className="text-xs text-gray-400 block">
                {level === 'beginner' && '(<50%)'}
                {level === 'intermediate' && '(50-79%)'}
                {level === 'advanced' && '(≥80%)'}
              </span>
            </Label>
            <Input
              placeholder="https://example.com/course"
              value={urls[level]}
              onChange={(e) => setUrls({ ...urls, [level]: e.target.value })}
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <Button onClick={saveRedirects} disabled={saving}>
        {saving ? 'Saving...' : 'Save Redirects'}
      </Button>
    </div>
  )
}
