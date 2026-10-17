import type { Resource } from "@/lib/gdrive/types"

export const DOCUMENT_CATEGORIES = [
  { id: "bylaws", label: "Bylaws" },
  { id: "financial", label: "Financial Reports" },
  { id: "budgets", label: "Budgets" },
  { id: "policies", label: "Policies & Procedures" },
  { id: "guidelines", label: "Service Guidelines" },
  { id: "calendars", label: "Calendars" },
  { id: "other", label: "Other Documents" },
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["id"]

export interface DocumentCategoryOption {
  id: string
  label: string
}

export const RESOURCE_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title: A–Z" },
  { value: "title-desc", label: "Title: Z–A" },
] as const

export type ResourceSortOrder = (typeof RESOURCE_SORT_OPTIONS)[number]["value"]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
}

export function getDocumentCategory(resource: Pick<Resource, "title" | "documentCategory">): DocumentCategoryOption {
  const assignedCategory = normalize(resource.documentCategory ?? "")
  const assigned = DOCUMENT_CATEGORIES.find(
    ({ id, label }) => id === assignedCategory || normalize(label) === assignedCategory,
  )
  if (assigned) return assigned
  if (assignedCategory) {
    return { id: `custom:${assignedCategory}`, label: resource.documentCategory!.trim() }
  }

  const title = normalize(resource.title)
  // Specific document types take priority over financial keywords.
  let category: DocumentCategory = "other"
  if (/\b(by ?laws?|constitution)\b/.test(title)) category = "bylaws"
  else if (/\b(polic(?:y|ies)|procedures?)\b/.test(title)) category = "policies"
  else if (/\bbudgets?\b/.test(title)) category = "budgets"
  else if (/\b(financ(?:e|ial)|qfr|treasur(?:y|er)|balance sheets?|income statements?|audits?|expenses?|reimbursements?|contributions?)\b/.test(title)) category = "financial"
  else if (/\b(guidelines?|handbooks?|manuals?|trusted servants?)\b/.test(title)) category = "guidelines"
  else if (/\b(calendars?|schedules?)\b/.test(title)) category = "calendars"

  return DOCUMENT_CATEGORIES.find(({ id }) => id === category)!
}

/** Include every saved category so new admin topics appear without a code change. */
export function getDocumentCategories(resources: Resource[]): DocumentCategoryOption[] {
  const categories = new Map<string, DocumentCategoryOption>(
    DOCUMENT_CATEGORIES.map((category) => [category.id, category]),
  )
  for (const resource of resources) {
    const category = getDocumentCategory(resource)
    if (!categories.has(category.id)) categories.set(category.id, category)
  }
  const custom = [...categories.values()].filter(({ id }) => id.startsWith("custom:"))
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }))
  return [...DOCUMENT_CATEGORIES, ...custom]
}

/** Preserve the chosen file sort within each category. */
export function groupResourcesByCategory(resources: Resource[]) {
  return getDocumentCategories(resources).map((category) => ({
    category,
    resources: resources.filter((resource) => getDocumentCategory(resource).id === category.id),
  })).filter((group) => group.resources.length > 0)
}

/** Prefer the document's own date to the year it was uploaded to Drive. */
export function getResourceDocumentDate(resource: Pick<Resource, "title" | "date">): string | undefined {
  const title = normalize(resource.title)
  const monthYear = title.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  )
  if (monthYear) {
    const month = monthYear[1][0].toUpperCase() + monthYear[1].slice(1)
    return `${month} ${monthYear[2]}`
  }
  return title.match(/\b(20\d{2})\b/)?.[1] ?? resource.date
}

function timestamp(value: string | undefined): number | null {
  if (!value) return null
  const parsed = /^\d{4}$/.test(value) ? Date.UTC(Number(value), 0, 1) : Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

const titleCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

/** Return a copy; undated files stay last in both date directions. */
export function sortResources(resources: Resource[], order: ResourceSortOrder): Resource[] {
  return [...resources].sort((a, b) => {
    const byTitle = titleCollator.compare(a.title, b.title)
    if (order === "title-asc") return byTitle
    if (order === "title-desc") return -byTitle

    const aModified = timestamp(a.modifiedTime)
    const bModified = timestamp(b.modifiedTime)
    const aDate = timestamp(getResourceDocumentDate(a)) ?? aModified
    const bDate = timestamp(getResourceDocumentDate(b)) ?? bModified
    if (aDate === null && bDate !== null) return 1
    if (aDate !== null && bDate === null) return -1

    const direction = order === "newest" ? -1 : 1
    const byDate = (aDate ?? 0) - (bDate ?? 0)
    if (byDate) return direction * byDate
    if (aModified === null && bModified !== null) return 1
    if (aModified !== null && bModified === null) return -1
    return direction * ((aModified ?? 0) - (bModified ?? 0)) || byTitle
  })
}
