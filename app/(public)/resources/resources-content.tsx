"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { ArrowDown, BookOpen, FileText, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResourceViewerWithPassword, ResourceItemWithViewer } from "./resource-viewer"
import { supportsInlinePdfPreview } from "@/lib/files/preview"
import type { Resource, ResourcesByCategory } from "@/lib/gdrive/types"
import {
  RESOURCE_SORT_OPTIONS,
  getDocumentCategories,
  getDocumentCategory,
  groupResourcesByCategory,
  sortResources,
  type ResourceSortOrder,
} from "@/lib/resources/organization"

interface ResourcesContentProps {
  resources: ResourcesByCategory
}

const resourceSections = [
  {
    id: "area-documents",
    key: "areaDocuments",
    category: "area-documents",
    legacyTab: "area",
    title: "Area Documents",
    description: "Budgets, procedures, handbooks, and other Area materials.",
    emptyLabel: "area documents",
    icon: FolderOpen,
  },
  {
    id: "forms",
    key: "forms",
    category: "forms",
    legacyTab: "forms",
    title: "Forms",
    description: "Common forms for groups, contributions, and service.",
    emptyLabel: "forms",
    icon: BookOpen,
  },
  {
    id: "delegate-reports",
    key: "delegateReports",
    category: "delegate-reports",
    legacyTab: "delegate",
    title: "Delegate Reports",
    description: "Reports and materials from the General Service Conference.",
    emptyLabel: "delegate reports",
    icon: FileText,
  },
] as const

type SectionKey = (typeof resourceSections)[number]["key"]

function ResourceList({ files, section, onView, grouped = false }: {
  files: Resource[]
  section: (typeof resourceSections)[number]
  onView: (resource: Resource) => void
  grouped?: boolean
}) {
  return (
    <ul className={grouped ? "divide-y divide-border" : "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"}>
      {files.map((resource) => (
        <li key={resource.id}>
          <ResourceItemWithViewer
            resource={resource}
            categoryLabel={!grouped ? getDocumentCategory(resource).label : undefined}
            headingLevel={grouped ? "h4" : "h3"}
            icon={section.icon}
            onView={onView}
          />
        </li>
      ))}
    </ul>
  )
}

export function ResourcesContent({ resources }: ResourcesContentProps) {
  const searchParams = useSearchParams()
  const legacyTab = searchParams.get("tab")
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [selectedResource, setSelectedResource] = React.useState<Resource | null>(null)
  const [categoryFilters, setCategoryFilters] = React.useState<Record<SectionKey, string>>({
    areaDocuments: "all",
    forms: "all",
    delegateReports: "all",
  })
  const [groupedSections, setGroupedSections] = React.useState<Record<SectionKey, boolean>>({
    areaDocuments: false,
    forms: false,
    delegateReports: false,
  })
  const [sortOrders, setSortOrders] = React.useState<Record<SectionKey, ResourceSortOrder>>({
    areaDocuments: "newest",
    forms: "newest",
    delegateReports: "newest",
  })
  const sectionViews = resourceSections.map((section) => {
    const filter = categoryFilters[section.key]
    const files = sortResources(
      resources[section.key].filter(
        (resource) => filter === "all" || getDocumentCategory(resource).id === filter,
      ),
      sortOrders[section.key],
    )
    return {
      section,
      files,
      categories: getDocumentCategories(resources[section.key]),
      groups: groupResourcesByCategory(files),
      grouped: groupedSections[section.key],
      isFiltered: filter !== "all",
    }
  })
  const selectedView = sectionViews.find(
    ({ section }) => section.category === selectedResource?.category,
  )
  const viewerFiles = selectedView
    ? selectedView.grouped ? selectedView.groups.flatMap((group) => group.resources) : selectedView.files
    : []

  React.useEffect(() => {
    // The library arrives after page load, so restore fragment links here too.
    const sectionId = window.location.hash.slice(1) || resourceSections.find(
      (section) => section.legacyTab === legacyTab,
    )?.id

    if (!sectionId || !resourceSections.some((section) => section.id === sectionId)) return

    const frame = requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ block: "start" })
    })
    return () => cancelAnimationFrame(frame)
  }, [legacyTab])

  const handleView = (resource: Resource) => {
    if (!supportsInlinePdfPreview(resource.mimeType)) return
    setSelectedResource(resource)
    setViewerOpen(true)
  }

  return (
    <>
      <nav
        aria-label="Document sections"
        className="mb-4 grid grid-cols-3 gap-2 sm:gap-3"
      >
        {resourceSections.map((section) => {
          const Icon = section.icon
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40 sm:text-sm"
            >
              <Icon className="hidden h-4 w-4 shrink-0 text-primary sm:block" aria-hidden="true" />
              <span className="min-w-0 flex-1 font-medium text-foreground">{section.title}</span>
              <span aria-hidden="true" className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                {resources[section.key].length}
              </span>
              <ArrowDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
            </a>
          )
        })}
      </nav>

      <div className="space-y-10">
        {sectionViews.map(({ section, files, categories, groups, grouped, isFiltered }) => {
          const totalFiles = resources[section.key].length
          const collectionLabel = section.key === "areaDocuments" ? "documents" : section.emptyLabel

          return (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              tabIndex={-1}
              className="scroll-mt-28"
            >
              <div className="mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 id={`${section.id}-heading`} className="text-2xl font-bold text-foreground">
                      {section.title}
                    </h2>
                    <span
                      role="status"
                      className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {files.length}{isFiltered ? ` of ${totalFiles}` : ""} {totalFiles === 1 ? "file" : "files"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="min-w-0 flex-1 space-y-1.5 sm:flex-none">
                      <Label htmlFor={`${section.id}-category`}>Category</Label>
                      <Select
                        value={categoryFilters[section.key]}
                        onValueChange={(value) => setCategoryFilters((previous) => ({
                          ...previous,
                          [section.key]: value,
                        }))}
                      >
                        <SelectTrigger
                          id={`${section.id}-category`}
                          aria-label={`Filter ${section.title.toLowerCase()} by category`}
                          className="w-full sm:w-56"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories ({totalFiles})</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label} ({resources[section.key].filter(
                                (resource) => getDocumentCategory(resource).id === category.id,
                              ).length})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="min-w-0 flex-1 space-y-1.5 sm:flex-none">
                    <Label htmlFor={`${section.id}-sort`}>Sort by</Label>
                    <Select
                      value={sortOrders[section.key]}
                      onValueChange={(value) => setSortOrders((previous) => ({
                        ...previous,
                        [section.key]: value as ResourceSortOrder,
                      }))}
                    >
                      <SelectTrigger
                        id={`${section.id}-sort`}
                        aria-label={`Sort ${section.title.toLowerCase()}`}
                        className="w-full sm:w-44"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_SORT_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="ml-auto flex h-9 items-center gap-2.5">
                    <Label htmlFor={`${section.id}-group-by-category`} className="text-sm">Group by category</Label>
                    <Switch
                      id={`${section.id}-group-by-category`}
                      checked={grouped}
                      onCheckedChange={(value) => setGroupedSections((previous) => ({
                        ...previous,
                        [section.key]: value,
                      }))}
                    />
                  </div>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  {isFiltered ? (
                    <>
                      <p>No {collectionLabel} in this category.</p>
                      <Button
                        variant="link"
                        className="mt-2 h-auto p-0"
                        onClick={() => setCategoryFilters((previous) => ({ ...previous, [section.key]: "all" }))}
                      >
                        Show all {collectionLabel}
                      </Button>
                    </>
                  ) : (
                    <>No {section.emptyLabel} available at this time.</>
                  )}
                </div>
              ) : grouped ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {groups.map((group, index) => (
                    <section
                      key={group.category.id}
                      aria-labelledby={`${section.id}-group-${index}`}
                      className="border-t border-border first:border-t-0"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5 sm:px-5">
                        <h3 id={`${section.id}-group-${index}`} className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
                          {group.category.label}
                        </h3>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {group.resources.length} {group.resources.length === 1 ? "file" : "files"}
                        </span>
                      </div>
                      <ResourceList files={group.resources} section={section} onView={handleView} grouped />
                    </section>
                  ))}
                </div>
              ) : (
                <ResourceList files={files} section={section} onView={handleView} />
              )}
            </section>
          )
        })}
      </div>

      <ResourceViewerWithPassword
        resource={selectedResource}
        resources={viewerFiles.filter(
          (resource) => supportsInlinePdfPreview(resource.mimeType),
        )}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onResourceChange={setSelectedResource}
      />
    </>
  )
}
