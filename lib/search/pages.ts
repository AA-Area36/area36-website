import type { ContentDoc, Scope } from "@/lib/content/schema"
import { districtCardId, getDistrictDirectory } from "@/lib/constants/district-directory"
import type { SearchEntry } from "./index"

export const SEARCH_PAGES: { scope: Scope; href: string; title: string }[] = [
  { scope: "home", href: "/", title: "Southern Minnesota Area 36" },
  { scope: "about", href: "/about", title: "About Area 36" },
  { scope: "committees", href: "/committees", title: "Committees & Officers" },
  { scope: "districts", href: "/districts", title: "Districts" },
  { scope: "events", href: "/events", title: "Events" },
  { scope: "resources", href: "/resources", title: "Documents & Forms" },
  { scope: "newsletter", href: "/newsletter", title: "The Pigeon Newsletter" },
  { scope: "recordings", href: "/recordings", title: "Recordings" },
  { scope: "reports", href: "/reports", title: "Monthly Reports" },
  { scope: "generalServiceConference", href: "/general-service-conference", title: "General Service Conference" },
  { scope: "serviceBasics", href: "/service-basics", title: "Service Basics" },
  { scope: "temporaryContactPrograms", href: "/temporary-contact-programs", title: "Temporary Contact Programs" },
  { scope: "correctionsTcp", href: "/corrections-temporary-contact-program", title: "Corrections Temporary Contact Program" },
  { scope: "treatmentTcp", href: "/treatment-temporary-contact-program", title: "Treatment Temporary Contact Program" },
  { scope: "professionals", href: "/professionals", title: "For Professionals" },
  { scope: "grapevine", href: "/grapevine", title: "Grapevine & La Viña" },
  { scope: "ypaa", href: "/ypaa", title: "Young People in A.A. (YPAA)" },
  { scope: "contribute", href: "/contribute", title: "Contribute" },
  { scope: "contact", href: "/contact", title: "Contact Area 36" },
]

const staticPages = [
  {
    href: "/area-assembly-april-26",
    title: "April 2026 Area Assembly Archive",
    description: "Archived information from the April 2026 Area Assembly and Delegates Workshop.",
  },
  {
    href: "/conference-manual-count",
    title: "Conference Manual Count",
    description: "Submit how many Conference Manuals you want to purchase.",
  },
]

const pageSections: Partial<Record<Scope, Record<string, string>>> = {
  about: { mission: "mission-heading", structure: "structure-heading", accessibility: "accessibility" },
  generalServiceConference: { background: "background-heading", advisoryActions: "materials-heading", finalReports: "reports-heading" },
  serviceBasics: {
    whyService: "why-service-heading",
    positions: "positions-heading",
    localResources: "local-resources-heading",
    gsoResources: "gso-resources-heading",
  },
}

function record(value: unknown): ContentDoc {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ContentDoc : {}
}

function string(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function textOf(value: unknown): string {
  if (typeof value === "string") return /^(?:https?:|mailto:|\/|#)/.test(value) ? "" : value
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join("\n")
  return Object.entries(record(value))
    .filter(([key]) => !/(?:href|url|src|placeholder|ariaLabel|Error)$/i.test(key))
    .map(([, child]) => textOf(child)).filter(Boolean).join("\n")
}

function districtEntries(content: ContentDoc | undefined): SearchEntry[] {
  const labels = record(record(content?.page).labels)
  return getDistrictDirectory(content?.directory).map((district) => {
    const anchor = districtCardId(district.number)
    const description = [
      district.meetingLocation,
      district.meetingAddress,
      [...district.counties, ...(district.cities ?? [])].join(", "),
    ].filter(Boolean).join(" · ")
    return {
      id: anchor,
      districtNumber: district.number,
      title: district.name,
      description,
      text: textOf(district),
      href: `/districts?district=${district.number}#${anchor}`,
      kind: "section",
      label: "District",
      keywords: [
        `district ${district.number} distrito ${district.number} dist ${district.number}`,
        "location address county city meeting meet time directions where dcm contact email",
        string(labels.location), string(labels.districtMeeting), string(labels.dcm),
      ].join(" "),
    }
  })
}

function committeeEntries(content: ContentDoc | undefined): SearchEntry[] {
  const committees = Object.entries(record(content?.committeesData)).map(([key, value]): SearchEntry => {
    const committee = record(value)
    const slug = encodeURIComponent(string(committee.slug) || key)
    const description = [string(committee.chairName), string(committee.email)].filter(Boolean).join(" · ")
    return {
      id: `committee:${key}`,
      title: string(committee.name) || key,
      description: description || textOf(committee.description ?? committee.descriptionParagraphs),
      text: textOf(committee),
      href: `/committees?committee=${slug}#committee-${slug}`,
      kind: "section",
      label: "Committee",
      keywords: "committee chair contact",
    }
  })
  const officers = Object.entries(record(content?.officers)).map(([key, value]): SearchEntry => {
    const officer = record(value)
    return {
      id: `officer:${key}`,
      title: string(officer.role) || key,
      description: [string(officer.name), string(officer.email)].filter(Boolean).join(" · "),
      text: textOf(officer),
      href: "/committees#officers-heading",
      kind: "section",
      label: "Area officer",
      keywords: "area officer contact",
    }
  })
  return [...committees, ...officers]
}

export function buildPageEntries(content: Partial<Record<Scope, ContentDoc>>): SearchEntry[] {
  const entries: SearchEntry[] = SEARCH_PAGES.flatMap(({ scope, href, title }) => {
    const doc = content[scope] ?? {}
    const header = record(doc.header ?? doc.hero ?? doc.page)
    const pageTitle = string(header.title) || [header.headingPrefix, header.headingAccent].filter(Boolean).join(" ") || title
    const searchable = { ...doc }
    delete searchable.directory
    delete searchable.committeesData
    delete searchable.officers
    delete searchable.form

    const sections = Object.entries(pageSections[scope] ?? {}).flatMap(([key, anchor]): SearchEntry[] => {
      const section = record(doc[key])
      const sectionTitle = string(section.title)
      if (!sectionTitle) return []
      delete searchable[key]
      const sectionHref = `${href}#${anchor}`
      return [{
        id: sectionHref,
        href: sectionHref,
        title: sectionTitle,
        description: string(section.description) || string(section.intro),
        text: textOf(section),
        kind: "section",
        label: pageTitle,
      }]
    })

    return [{
      id: href,
      title: pageTitle,
      keywords: pageTitle === title ? undefined : title,
      href,
      kind: "page",
      label: "Page",
      description: string(header.description) || string(header.intro),
      text: textOf(searchable),
    }, ...sections]
  })

  for (const page of staticPages) {
    entries.push({ ...page, id: page.href, kind: "page", label: "Page", text: "" })
  }

  return [...entries, ...districtEntries(content.districts), ...committeeEntries(content.committees)]
}
