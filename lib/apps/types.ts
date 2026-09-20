export interface AppRecord {
  id: string
  slug: string
  name: string
  description: string
  copyright: string
  privacyPolicy: string
  defaultLanguage: string
  disableSessionSameSite: boolean
  apiKey: string
  apiUrl: string
  icon: string
  iconBackground: string
  showPoweredBy: boolean
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export type AppInput = {
  id: string
  slug: string
  apiKey: string
  apiUrl: string
} & Partial<Omit<AppRecord, 'id' | 'slug' | 'apiKey' | 'apiUrl' | 'createdAt' | 'updatedAt'>>

/**
 * What the browser is allowed to know: no credentials, no admin-only flags.
 */
export interface PublicApp {
  id: string
  slug: string
  name: string
  description: string
  copyright: string
  privacyPolicy: string
  defaultLanguage: string
  disableSessionSameSite: boolean
  icon: string
  iconBackground: string
  showPoweredBy: boolean
  /** only the admin UI cares; the public pages filter disabled apps out */
  enabled: boolean
  /** epoch ms, shown in the admin table */
  updatedAt: number
}

export const toPublicApp = (app: AppRecord): PublicApp => ({
  id: app.id,
  slug: app.slug,
  name: app.name,
  description: app.description,
  copyright: app.copyright,
  privacyPolicy: app.privacyPolicy,
  defaultLanguage: app.defaultLanguage,
  disableSessionSameSite: app.disableSessionSameSite,
  icon: app.icon,
  iconBackground: app.iconBackground,
  showPoweredBy: app.showPoweredBy,
  enabled: app.enabled,
  updatedAt: app.updatedAt,
})
