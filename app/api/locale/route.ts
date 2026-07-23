import { NextResponse } from "next/server"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as unknown
  const requested =
    body !== null &&
    typeof body === "object" &&
    "locale" in body &&
    typeof body.locale === "string"
      ? body.locale
      : null
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE

  const response = NextResponse.json({ ok: true, locale })
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
  response.headers.set("x-locale", locale)
  return response
}
