export const SUPPORTED_LOCALES = ["en", "es", "hmn", "so"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

export const LOCALE_COOKIE = "a36_locale"

export function isLocale(value: string | null | undefined): value is Locale {
  if (!value) return false
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

