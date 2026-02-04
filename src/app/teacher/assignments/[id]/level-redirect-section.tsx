'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LevelRedirect } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'

interface LevelRedirectSectionProps {
  assignmentId: string
  redirects: LevelRedirect[]
}

type RedirectType = 'none' | 'link' | 'embed'

interface LevelConfig {
  type: RedirectType
  url: string
  embedCode: string
}

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export function LevelRedirectSection({ assignmentId, redirects }: LevelRedirectSectionProps) {
  const [configs, setConfigs] = useState<Record<string, LevelConfig>>({
    beginner: { type: 'none', url: '', embedCode: '' },
    intermediate: { type: 'none', url: '', embedCode: '' },
    advanced: { type: 'none', url: '', embedCode: '' },
  })
  const [saving, setSaving] = useState(false)
  const [previewLevel, setPreviewLevel] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const configMap: Record<string, LevelConfig> = {
      beginner: { type: 'none', url: '', embedCode: '' },
      intermediate: { type: 'none', url: '', embedCode: '' },
      advanced: { type: 'none', url: '', embedCode: '' },
    }
    redirects.forEach((r) => {
      configMap[r.level] = {
        type: r.redirect_type as RedirectType,
        url: r.redirect_url || '',
        embedCode: r.embed_code || '',
      }
    })
    setConfigs(configMap)
  }, [redirects])

  const updateConfig = (level: string, field: keyof LevelConfig, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [level]: { ...prev[level], [field]: value }
    }))
  }

  const saveRedirects = async () => {
    setSaving(true)

    for (const level of LEVELS) {
      const config = configs[level]
      const existing = redirects.find((r) => r.level === level)

      if (config.type === 'none') {
        // Delete if exists
        if (existing) {
          await supabase
            .from('level_redirect')
            .delete()
            .eq('id', existing.id)
        }
      } else {
        const data = {
          assignment_id: assignmentId,
          level,
          redirect_type: config.type as 'link' | 'embed',
          redirect_url: config.type === 'link' ? config.url.trim() : null,
          embed_code: config.type === 'embed' ? config.embedCode.trim() : null,
        }

        if (existing) {
          await supabase
            .from('level_redirect')
            .update(data)
            .eq('id', existing.id)
        } else {
          await supabase
            .from('level_redirect')
            .insert(data)
        }
      }
    }

    setSaving(false)
    router.refresh()
  }

  // Strip scripts for safe preview (scripts won't execute in preview)
  const sanitizeForPreview = (html: string): string => {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Configure what students see based on their level. You can either redirect them to an external link
        or show them embedded content (like H5P interactive modules).
      </p>

      <div className="space-y-6">
        {LEVELS.map((level) => (
          <Card key={level}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="capitalize font-medium text-lg">
                  {level}
                  <span className="text-xs text-gray-400 block font-normal">
                    {level === 'beginner' && '(<50%)'}
                    {level === 'intermediate' && '(50-79%)'}
                    {level === 'advanced' && '(≥80%)'}
                  </span>
                </Label>
              </div>

              {/* Radio group for type selection */}
              <RadioGroup
                value={configs[level].type}
                onValueChange={(val) => updateConfig(level, 'type', val)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id={`${level}-none`} />
                  <Label htmlFor={`${level}-none`} className="font-normal cursor-pointer">
                    No redirect
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id={`${level}-link`} />
                  <Label htmlFor={`${level}-link`} className="font-normal cursor-pointer">
                    External link (opens in new tab)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="embed" id={`${level}-embed`} />
                  <Label htmlFor={`${level}-embed`} className="font-normal cursor-pointer">
                    Embedded content (H5P, iframe, etc.)
                  </Label>
                </div>
              </RadioGroup>

              {/* URL input for link type */}
              {configs[level].type === 'link' && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor={`${level}-url`} className="text-sm text-gray-600">
                    Redirect URL
                  </Label>
                  <Input
                    id={`${level}-url`}
                    placeholder="https://example.com/course"
                    value={configs[level].url}
                    onChange={(e) => updateConfig(level, 'url', e.target.value)}
                  />
                </div>
              )}

              {/* Embed code textarea for embed type */}
              {configs[level].type === 'embed' && (
                <div className="pl-6 space-y-3">
                  <Label htmlFor={`${level}-embed`} className="text-sm text-gray-600">
                    Embed Code (HTML)
                  </Label>
                  <Textarea
                    id={`${level}-embed`}
                    placeholder={'<iframe src="https://app.lumi.education/api/v1/run/..."></iframe>\n<script src="..."></script>'}
                    value={configs[level].embedCode}
                    onChange={(e) => updateConfig(level, 'embedCode', e.target.value)}
                    rows={5}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Paste the full embed code including iframe and script tags.
                    Students will see this content after viewing their results.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setPreviewLevel(previewLevel === level ? null : level)}
                    >
                      {previewLevel === level ? 'Hide Preview' : 'Preview'}
                    </Button>
                  </div>
                  {previewLevel === level && configs[level].embedCode && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-2">
                        Preview (scripts disabled for safety):
                      </p>
                      <div
                        className="min-h-[200px] bg-white rounded border"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeForPreview(configs[level].embedCode)
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={saveRedirects} disabled={saving}>
        {saving ? 'Saving...' : 'Save Redirects'}
      </Button>
    </div>
  )
}
