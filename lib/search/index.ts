import MiniSearch from "minisearch"
import type { Resource } from "@/lib/gdrive/types"

export const SEARCH_GROUPS = [
  { id: "documents", label: "Documents & forms" },
  { id: "pages", label: "Pages & sections" },
  { id: "information", label: "General site information" },
] as const

export type SearchGroup = typeof SEARCH_GROUPS[number]["id"]

export type SearchEntry = {
  id: string
  title: string
  description: string
  text: string
  href: string
  kind: "page" | "section" | "document"
  label: string
  keywords?: string
  districtNumber?: number
  resource?: Resource
}

const tokenize: (value: string) => string[] = MiniSearch.getDefault("tokenize")
const stopWords = new Set(["a", "an", "the", "is", "does", "do", "of", "to", "for", "in", "i", "can", "find"])

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
}

function searchTerms(value: string): string[] {
  return tokenize(normalize(value)).filter((term) => term && !stopWords.has(term))
}

export function createSearchIndex(entries: SearchEntry[]) {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]))
  const index = new MiniSearch<SearchEntry>({
    fields: ["title", "description", "text", "keywords"],
    processTerm: normalize,
    searchOptions: {
      boost: { title: 5, keywords: 2, description: 2 },
      combineWith: "AND",
      prefix: (term) => /^\p{L}{3,}$/u.test(term),
      fuzzy: (term) => /^\p{L}{5,}$/u.test(term) ? 1 : false,
    },
  })
  index.addAll([...entriesById.values()])

  return (query: string) => {
    const groups: Record<SearchGroup, SearchEntry[]> = { documents: [], pages: [], information: [] }
    const district = /\b(?:district|distict|distrito|dist)\s*[#.-]?\s*0*(\d{1,2})\b/
    const normalizedQuery = normalize(query)
    const districtMatch = normalizedQuery.match(district)
    const districtNumber = districtMatch ? Number(districtMatch[1]) : undefined
    const phrase = searchTerms(normalizedQuery.replace(district, (_, number) => `district ${Number(number)}`)).join(" ")
    if (!phrase) return groups

    const matches = index.search(phrase)
      .map((match) => ({ match, entry: entriesById.get(String(match.id))! }))
      .filter(({ entry }) => districtNumber === undefined || entry.districtNumber === undefined || entry.districtNumber === districtNumber)
      .sort((a, b) => {
        if (districtNumber !== undefined) {
          const districtRank = Number(b.entry.districtNumber === districtNumber) - Number(a.entry.districtNumber === districtNumber)
          if (districtRank) return districtRank
        }
        const exactA = searchTerms(a.entry.title).join(" ") === phrase
        const exactB = searchTerms(b.entry.title).join(" ") === phrase
        return Number(exactB) - Number(exactA) || b.match.score - a.match.score
      })

    for (const { entry, match } of matches) {
      if (entry.kind === "document") {
        groups.documents.push(entry)
      } else if (entry.kind === "section" || Object.values(match.match).some((fields) => fields.includes("title") || fields.includes("keywords"))) {
        groups.pages.push(entry)
      } else {
        groups.information.push(entry)
      }
    }

    return groups
  }
}

export function searchSnippet(entry: SearchEntry, query: string): string {
  const terms = searchTerms(query)
  const excerpts = entry.text.split("\n").filter((excerpt) => excerpt && excerpt !== entry.title)
  const bestExcerpt = excerpts
    .map((text) => ({ text, score: terms.filter((term) => normalize(text).includes(term)).length }))
    .sort((a, b) => b.score - a.score)[0]
  const text = entry.districtNumber !== undefined || terms.some((term) => normalize(entry.description).includes(term))
    ? entry.description
    : bestExcerpt?.score ? bestExcerpt.text : entry.description
  const positions = terms.map((term) => normalize(text).indexOf(term)).filter((position) => position >= 0)
  const start = positions.length ? Math.max(0, Math.min(...positions) - 55) : 0
  return `${start > 0 ? "…" : ""}${text.slice(start, start + 190)}${text.length > start + 190 ? "…" : ""}`
}
