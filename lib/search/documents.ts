import type { CalendarFile } from "@/app/(public)/events/calendar-file-actions"
import type { CommitteeFiles } from "@/lib/gdrive/committees"
import type { ServiceResource } from "@/lib/gdrive/service-resources"
import type { Newsletter, Resource, ResourcesByCategory } from "@/lib/gdrive/types"
import type { BackgroundFile, BackgroundMaterialsData } from "@/lib/hooks/use-gdrive-files"
import type { SearchEntry } from "./index"

const resourceLabels = {
  "area-documents": "Area documents",
  "delegate-reports": "Delegate reports",
  "conference-materials": "Conference materials",
  forms: "Forms",
} satisfies Record<Resource["category"], string>

function conferenceFile(file: BackgroundFile | CalendarFile): Resource {
  return {
    ...file,
    title: file.displayName || file.name,
    category: "conference-materials",
    driveId: file.id,
  }
}

export function buildDocumentEntries(catalogs: {
  resources?: ResourcesByCategory | null
  committees?: CommitteeFiles | null
  service?: ServiceResource[] | null
  newsletters?: Newsletter[] | null
  conference?: Resource[]
  background?: BackgroundMaterialsData | null
  calendars?: CalendarFile[]
}): SearchEntry[] {
  const entries = new Map<string, SearchEntry>()
  const add = (resource: Resource, label: string, extra = "") => {
    const { driveId, title, description, documentCategory, date, previewUrl } = resource
    const text = [title, description, documentCategory, date, label, extra].filter(Boolean).join("\n")
    const existing = entries.get(driveId)
    if (existing?.resource) {
      existing.text += `\n${text}`
      existing.resource.isProtected ||= resource.isProtected
      existing.resource.isRestricted ||= resource.isRestricted
      return
    }

    entries.set(driveId, {
      id: `file:${driveId}`,
      title,
      description: description ?? "",
      text,
      href: previewUrl,
      kind: "document",
      label: documentCategory || label,
      resource: { ...resource, id: driveId },
    })
  }

  const resourceGroups: Resource[][] = Object.values(catalogs.resources ?? {})
  for (const resource of resourceGroups.flat()) {
    add(resource, resourceLabels[resource.category])
  }
  for (const [slug, files] of Object.entries(catalogs.committees ?? {})) {
    for (const file of files) {
      add({ ...file, title: file.name, category: "area-documents", driveId: file.id, documentCategory: file.category },
        `${slug.replaceAll("-", " ")} committee`)
    }
  }
  for (const file of catalogs.service ?? []) {
    add({ ...file, title: file.name, category: "area-documents", driveId: file.id, documentCategory: file.category },
      "Service resources", file.fileName)
  }
  for (const newsletter of catalogs.newsletters ?? []) {
    add({ ...newsletter, title: `${newsletter.title} — ${newsletter.issue}`, mimeType: "application/pdf", category: "area-documents" },
      "Newsletter", newsletter.highlights.join(" "))
  }
  for (const resource of catalogs.conference ?? []) add(resource, "Conference materials")
  for (const file of catalogs.calendars ?? []) {
    add({ ...conferenceFile(file), category: "area-documents" }, "Annual calendar", file.name)
  }
  if (catalogs.background) {
    const { agendaItems, backgroundMaterials, advisoryActions, miscFiles } = catalogs.background
    for (const file of agendaItems) add(conferenceFile(file), "Conference agenda items", file.name)
    for (const file of backgroundMaterials) add(conferenceFile(file), "Conference background materials", file.name)
    for (const file of advisoryActions) add(conferenceFile(file), "Conference advisory actions", file.name)
    for (const file of miscFiles) add(conferenceFile(file), "Conference materials", file.name)
  }
  return [...entries.values()]
}
