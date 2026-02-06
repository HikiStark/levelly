'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale } from 'next-intl'

export function LanguageToggle() {
  const router = useRouter()
  const locale = useLocale()

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'de' : 'en'
    document.cookie = `LEVELLY_LOCALE=${newLocale}; path=/; max-age=31536000`
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage}>
      {locale === 'en' ? 'DE' : 'EN'}
    </Button>
  )
}
