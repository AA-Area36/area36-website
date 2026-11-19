"use client"

import { useMemo, useState } from "react"
import Form from "next/form"
import Link from "next/link"
import { ArrowRight, FileText, Search } from "lucide-react"
import { ResourceItemWithViewer, ResourceViewerWithPassword } from "../resources/resource-viewer"
import type { CalendarFile } from "../events/calendar-file-actions"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Resource } from "@/lib/gdrive/types"
import { createSearchIndex, SEARCH_GROUPS, searchSnippet, type SearchEntry, type SearchGroup } from "@/lib/search"
import { useDocumentCatalogs } from "./use-document-catalogs"

const GROUP_PAGE_SIZE = 6
const FILTERS = [{ id: "all", label: "All results" }, ...SEARCH_GROUPS] as const

function searchHref(query: string, group: SearchGroup | "all" = "all") {
  const params = new URLSearchParams({ q: query })
  if (group !== "all") params.set("type", group)
  return `/search?${params.toString()}`
}

export function SearchClient({ query, group, pages, calendars }: {
  query: string
  group: SearchGroup | "all"
  pages: SearchEntry[]
  calendars: CalendarFile[]
}) {
  const [viewing, setViewing] = useState<Resource | null>(null)
  const { documents, loading, hasErrors, retry } = useDocumentCatalogs(Boolean(query), calendars)
  const search = useMemo(() => createSearchIndex([...pages, ...documents]), [pages, documents])
  const results = useMemo(() => search(query), [search, query])
  const matchingResources = useMemo(() => results.documents.flatMap((entry) => entry.resource ?? []), [results.documents])
  const total = SEARCH_GROUPS.reduce((sum, { id }) => sum + results[id].length, 0)
  const visibleGroups = SEARCH_GROUPS.filter(({ id }) => group === "all" || id === group)
  const count = group === "all" ? total : results[group].length
  const showDocumentStatus = group === "all" || group === "documents"

  return (
    <>
      <PageHeader
        title="Search Area 36"
        description="Find a document, district meeting location, committee contact, or service topic."
        variant="compact"
        ariaId="search-heading"
      />
      <section aria-labelledby="search-heading" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Form action="/search" role="search" scroll={false} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <Input
              key={query}
              name="q"
              type="search"
              aria-label="Search Area 36"
              placeholder="Try “assembly minutes” or “district 7 location”"
              autoComplete="off"
              maxLength={200}
              defaultValue={query}
              className="h-12 pl-12 text-base"
            />
          </div>
          <Button type="submit" className="h-12 px-5">Search</Button>
        </Form>

        {query && (
          <>
            <nav aria-label="Filter search results" className="mt-5 flex flex-wrap gap-2">
              {FILTERS.map(({ id, label }) => (
                <Button key={id} asChild variant={id === group ? "default" : "outline"} size="sm">
                  <Link href={searchHref(query, id)} aria-current={id === group ? "page" : undefined} scroll={false}>
                    {label}
                    <span className="ml-1 tabular-nums opacity-80">{id === "all" ? total : results[id].length}</span>
                  </Link>
                </Button>
              ))}
            </nav>

            <div role="status" className="mt-7 text-sm text-muted-foreground">
              <p>
                {count} {count === 1 ? "result" : "results"} for <span className="break-words font-medium text-foreground">“{query}”</span>
                {showDocumentStatus && loading && <span> · Searching document catalogs…</span>}
              </p>
            </div>

            {showDocumentStatus && hasErrors && (
              <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <p>Some document catalogs are temporarily unavailable.</p>
                <Button variant="outline" size="sm" onClick={() => { void retry() }}>Retry documents</Button>
              </div>
            )}

            <div className="mt-7 space-y-9">
              {visibleGroups.map(({ id, label }) => results[id].length > 0 && (
                <SearchResultGroup key={`${query}:${group}:${id}`} id={id} label={label} entries={results[id]} query={query} onView={setViewing} />
              ))}
            </div>

            {count === 0 && !(showDocumentStatus && loading) && (
              <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
                <h2 className="text-lg font-semibold">No matching results</h2>
                <p className="mt-2 text-muted-foreground">Try a shorter search or a different term.</p>
                {group !== "all" && (
                  <Button asChild variant="outline" className="mt-5">
                    <Link href={searchHref(query)} scroll={false}>Show all results</Link>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
        <ResourceViewerWithPassword
          resource={viewing}
          resources={matchingResources}
          open={!!viewing}
          onOpenChange={(open) => { if (!open) setViewing(null) }}
          onResourceChange={setViewing}
        />
      </section>
    </>
  )
}

function SearchResultGroup({ id, label, entries, query, onView }: {
  id: SearchGroup
  label: string
  entries: SearchEntry[]
  query: string
  onView: (resource: Resource) => void
}) {
  const [limit, setLimit] = useState(GROUP_PAGE_SIZE)

  return (
    <section aria-labelledby={`search-results-${id}`}>
      <h2 id={`search-results-${id}`} className="mb-3 text-lg font-semibold">{label}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {entries.slice(0, limit).map((entry) => (
          <li key={entry.id}>
            {entry.resource ? (
              <ResourceItemWithViewer resource={entry.resource} categoryLabel={entry.label} icon={FileText} onView={onView} />
            ) : (
              <Link href={entry.href} className="group flex items-start justify-between gap-4 rounded-lg px-5 py-4 transition-colors hover:bg-muted/30">
                <div className="min-w-0">
                  <h3 className="font-semibold text-primary group-hover:underline">{entry.title}</h3>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{entry.label}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{searchSnippet(entry, query)}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ul>
      {entries.length > limit && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setLimit(limit + GROUP_PAGE_SIZE)}>
          Show more {label.toLowerCase()}
        </Button>
      )}
    </section>
  )
}
