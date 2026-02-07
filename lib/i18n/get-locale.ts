import { cookies, headers } from "next/headers"
import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/accept-language"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales"

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const rawCookie = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(rawCookie)) return rawCookie

  const headerStore = await headers()
  const acceptLanguage = headerStore.get("accept-language")
  return detectLocaleFromAcceptLanguage(acceptLanguage)
}

export function localeToHtmlLang(locale: Locale): string {
  // These are primary language tags; keep them short for HTML `lang`.
  return locale || DEFAULT_LOCALE
}

