import Cookies from 'js-cookie'
import type { Locale } from '.'
import { i18n } from '.'
import { BASE_PATH, LOCALE_COOKIE_NAME } from '@/config'
import { changeLanguage } from '@/i18n/i18next-config'

// same logic as server
export const getLocaleOnClient = (): Locale => {
  return Cookies.get(LOCALE_COOKIE_NAME) as Locale || i18n.defaultLocale
}

export const setLocaleOnClient = (locale: Locale, notReload?: boolean) => {
  // keep the cookie inside the app's sub-path instead of taking over the domain
  Cookies.set(LOCALE_COOKIE_NAME, locale, { path: BASE_PATH || '/' })
  changeLanguage(locale)
  if (!notReload) { location.reload() }
}
