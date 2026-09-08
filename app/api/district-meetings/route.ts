import { isDateOnly, calendarDayDifference } from "@/lib/utils/date-only"
import { parseLocalDate, formatDate } from "@/lib/utils/recurrence"
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
    if (k === name) {
      try { return decodeURIComponent(rest.join("=")) } catch { return null }
    }
  }
  return null
}

function getLocaleFromRequest(request: Request): Locale {
  const fromCookie = parseCookie(request.headers.get("cookie"), LOCALE_COOKIE)
  if (isLocale(fromCookie)) return fromCookie
  return detectLocaleFromAcceptLanguage(request.headers.get("accept-language"))
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

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const defaultEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  const start = url.searchParams.get("start") ?? formatDate(defaultStart)
  const end = url.searchParams.get("end") ?? formatDate(defaultEnd)
  if (!isDateOnly(start) || !isDateOnly(end) || end < start || calendarDayDifference(start, end) > 731) {
    return NextResponse.json({ error: "Use valid start and end dates spanning at most two years." }, { status: 400 })
  }
  // Generator and request bounds both use local calendar midnights (including DST).
  const rangeStart = parseLocalDate(start)
  const rangeEnd = parseLocalDate(end)

  const content = await getContent("districts", locale).catch(async () => getContent("districts", DEFAULT_LOCALE))
  const directoryRaw = getAtPath(content, "directory")
  const directory: DistrictDirectoryEntry[] = isDistrictDirectory(directoryRaw) ? directoryRaw : []

  const events = buildDistrictMonthlyMeetingOccurrences(rangeStart, rangeEnd, directory)
  return NextResponse.json(events, { headers: { "Cache-Control": "private, max-age=60", Vary: "Cookie, Accept-Language" } })
}
