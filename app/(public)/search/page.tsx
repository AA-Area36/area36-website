import type { Metadata } from "next"
import { getContentMany } from "@/lib/content/repo"
import { getRequestLocale } from "@/lib/i18n/get-locale"
import { SEARCH_GROUPS } from "@/lib/search"
import { buildPageEntries, SEARCH_PAGES } from "@/lib/search/pages"
import { getAnnualCalendarFiles } from "../events/calendar-file-actions"
import { SearchClient } from "./search-client"

export const metadata: Metadata = {
  title: "Search | Area 36",
  description: "Search Area 36 documents, districts, committees, and site information.",
  robots: { index: false },
}

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()])
  const query = typeof params.q === "string" ? params.q.slice(0, 200).trim() : ""
  const group = SEARCH_GROUPS.find(({ id }) => id === params.type)?.id ?? "all"
  const [content, calendars] = await Promise.all([
    getContentMany(SEARCH_PAGES.map((page) => page.scope), locale),
    query ? getAnnualCalendarFiles() : [],
  ])

  return <SearchClient query={query} group={group} pages={buildPageEntries(content)} calendars={calendars} />
}
