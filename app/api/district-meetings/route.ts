import { NextResponse } from "next/server"
import { getContent } from "@/lib/content/repo"
import { getAtPath } from "@/lib/content/t"
import { buildDistrictMonthlyMeetingOccurrences } from "@/lib/utils/district-monthly-meetings"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales"
import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/accept-language"
import type { DistrictDirectoryEntry } from "@/lib/constants/district-directory"

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

function getLocaleFromRequest(request: Request): Locale {
  const fromCookie = parseCookie(request.headers.get("cookie"), LOCALE_COOKIE)
  if (isLocale(fromCookie)) return fromCookie
  return detectLocaleFromAcceptLanguage(request.headers.get("accept-language"))
}

function parseYmd(value: string | null): Date | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split("-").map((n) => Number(n))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  // Stable date-only representation (UTC midnight) to avoid timezone drift.
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function isDistrictDirectory(value: unknown): value is DistrictDirectoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (district) =>
        district !== null &&
        typeof district === "object" &&
        "number" in district &&
        typeof district.number === "number" &&
        "name" in district &&
        typeof district.name === "string",
    )
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = getLocaleFromRequest(request)

  const start = parseYmd(url.searchParams.get("start"))
  const end = parseYmd(url.searchParams.get("end"))

  // Default range: yesterday through one year from today (America/Chicago is handled client-side).
  const rangeStart = start ?? new Date(Date.now() - 24 * 60 * 60 * 1000)
  const rangeEnd = end ?? new Date(new Date().setFullYear(new Date().getFullYear() + 1))

  const content = await getContent("districts", locale).catch(async () => getContent("districts", DEFAULT_LOCALE))
  const directoryRaw = getAtPath(content, "directory")
  const directory: DistrictDirectoryEntry[] = isDistrictDirectory(directoryRaw) ? directoryRaw : []

  const events = buildDistrictMonthlyMeetingOccurrences(rangeStart, rangeEnd, directory)
  return NextResponse.json(events)
}
