import 'server-only'

import { cookies, headers } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import { LOCALE_COOKIE_NAME } from '@/config'
import type { Locale } from '.'
import { i18n } from '.'

const isSupportedLocale = (locale?: string | null): locale is Locale =>
  !!locale && (i18n.locales as readonly string[]).includes(locale)

// Negotiator returns `['*']` when the `Accept-Language` header is missing and passes
// malformed tags through. Both make `@formatjs/intl-localematcher` throw a RangeError,
// so keep only well-formed language tags ("*" is dropped as well).
const getValidLanguages = (headers: Record<string, string>): string[] =>
  new Negotiator({ headers }).languages().filter((language) => {
    if (!language || language === '*') {
      return false
    }
    try {
      Intl.getCanonicalLocales(language)
      return true
    }
    catch {
      return false
    }
  })

export const getLocaleOnServer = async (): Promise<Locale> => {
  // get locale from cookie
  const localeCookie = (await cookies()).get(LOCALE_COOKIE_NAME)?.value
  if (isSupportedLocale(localeCookie)) {
    return localeCookie
  }

  // Negotiator expects plain object so we need to transform headers
  const negotiatorHeaders: Record<string, string> = {}
  const headersList = await headers()
  headersList.forEach((value, key) => (negotiatorHeaders[key] = value))

  // Use negotiator and intl-localematcher to get best locale
  const languages = getValidLanguages(negotiatorHeaders)
  if (!languages.length) {
    return i18n.defaultLocale
  }

  // match locale
  const matchedLocale = match(languages, i18n.locales as readonly string[], i18n.defaultLocale) as Locale
  return matchedLocale
}
