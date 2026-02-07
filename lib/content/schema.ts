import type { Locale } from "@/lib/i18n/locales"
import { districtDirectory } from "@/lib/constants/district-directory"

export type Scope = "global" | "home" | "districts"

export type ContentDoc = Record<string, unknown>

export type FieldType = "text" | "textarea" | "link" | "json"

export type ContentField = {
  path: string
  label: string
  help?: string
  type: FieldType
  rows?: number
  translatable?: boolean
}

export type ContentSection = {
  id: string
  title: string
  description?: string
  fields: ContentField[]
}

export type ContentSchema = {
  scope: Scope
  title: string
  description: string
  sections: ContentSection[]
  // English defaults are the base for all locales.
  defaultsEn: ContentDoc
}

export const SUPPORTED_LOCALE_LABELS: Record<Locale, { name: string; nativeName: string }> = {
  en: { name: "English", nativeName: "English" },
  es: { name: "Spanish", nativeName: "Español" },
  hmn: { name: "Hmong", nativeName: "Hmoob" },
  so: { name: "Somali", nativeName: "Soomaali" },
}

const globalDefaultsEn = {
  header: {
    brand: { title: "Area 36", subtitle: "Southern Minnesota A.A." },
    nav: {
      home: "Home",
      events: "Events",
      about: {
        label: "About",
        aboutArea36: "About Area 36",
        committeesOfficers: "Committees & Officers",
        districts: "Districts",
      },
      resources: {
        label: "Resources",
        documentsForms: "Documents & Forms",
        newsletter: "Newsletter",
        recordings: "Recordings",
        generalServiceConference: "General Service Conference",
        serviceBasics: "Service Basics",
        temporaryContactProgram: "Temporary Contact Program",
        forProfessionals: "For Professionals",
        grapevine: "Grapevine & La Viña",
      },
      ypaa: "YPAA",
      contribute: "Contribute",
      contact: "Contact",
    },
  },
  footer: {
    brand: { title: "Area 36", subtitle: "Southern Minnesota A.A." },
    blurb:
      "The primary purpose of this website is to facilitate communication within Area 36 and between Area 36 and A.A. members.",
    titles: {
      aaResources: "A.A. Resources",
      area: "Area 36",
      contact: "Contact",
    },
    quickLinks: {
      findMeeting: { label: "Find a Meeting", href: "https://www.aa.org/find-aa" },
      aaOrg: { label: "AA.org", href: "https://www.aa.org" },
      gso: { label: "General Service Office", href: "https://www.aa.org/aa-gso" },
      grapevine: { label: "Grapevine", href: "https://www.aagrapevine.org" },
    },
    areaLinks: {
      events: { label: "Events Calendar", href: "/events" },
      committees: { label: "Committees & Officers", href: "/committees" },
      districts: { label: "Districts", href: "/districts" },
      resources: { label: "Resources", href: "/resources" },
      newsletter: { label: "Newsletter", href: "/newsletter" },
      service: { label: "Service Basics", href: "/service" },
      ypaa: { label: "YPAA", href: "/ypaa" },
      contribute: { label: "Contribute", href: "/contribute" },
    },
    contact: {
      addressLines: ["SMAA", "P.O. Box 2812", "Minneapolis, MN 55402"],
      emailLabel: "chairperson@area36.org",
      emailHref: "mailto:chairperson@area36.org",
    },
    bottom: {
      copyright: "© {year} Southern Minnesota Area 36 of Alcoholics Anonymous. All rights reserved.",
      aslResources: "ASL Resources",
      accessibility: "Accessibility",
      opensNewTab: "(opens in new tab)",
    },
  },
} satisfies ContentDoc

const homeDefaultsEn = {
  hero: {
    headingPrefix: "Southern Minnesota",
    headingAccent: "Area 36",
    intro:
      "Welcome to the A.A. General Service website for Southern Minnesota Area 36, also known as the Southern Minnesota Area Assembly (SMAA).",
    buttons: {
      events: { label: "View Events", href: "/events" },
      meeting: { label: "Find a Meeting", href: "https://www.aa.org/find-aa" },
    },
    quickCards: {
      events: { title: "Upcoming Events", description: "View assemblies, workshops, and service events.", href: "/events" },
      newsletter: { title: "Newsletter", description: "Read the latest Area 36 newsletter online.", href: "/newsletter" },
      resources: { title: "Resources", description: "Access forms, documents, and materials.", href: "/resources" },
      involved: { title: "Get Involved", description: "Learn about service and how to participate.", href: "/service" },
    },
  },
} satisfies ContentDoc

const districtsDefaultsEn = {
  page: {
    title: "Districts",
    intro:
      "Area 36 is divided into 26 geographic districts plus District 27, a linguistic district for Spanish-speaking groups.\nDistricts are the link between individual A.A. groups and the Area.",
    map: {
      iframeSrc:
        "https://www.google.com/maps/d/embed?mid=1bWv6ZTXR3oJkSNeEtZHCz-onv1WKKbvi&ehbc=2E312F&ll=44.55241125552111%2C-94.026905&z=7",
      iframeTitle: "Area 36 District Map",
      sectionAriaLabel: "District map",
      sectionAriaLabelList: "District list",
    },
    allTitle: "All Districts ({count})",
    searchPlaceholder: "Search by district, county, city, or DCM...",
    searchAriaLabel: "Search districts",
    badges: {
      open: "DCM Position Open",
      spanish: "Spanish Speaking",
    },
    labels: {
      location: "Location",
      dcm: "DCM",
      districtMeeting: "District Meeting",
      citiesPrefix: "Cities:",
      actions: "Actions",
      positionOpen: "Position currently open",
    },
    actions: {
      emailDcm: "Email DCM",
      visitWebsite: "Visit District Website",
      directions: "Get Directions",
      noActions:
        "Contact the Area Chairperson for more information about this district.",
    },
    empty: {
      noResults: 'No districts found matching "{query}"',
    },
    about: {
      title: "What is a District?",
      p1:
        "A district is a geographical unit within the A.A. General Service structure that includes a number of groups. Districts are the vital link between individual groups and the Area, helping to ensure that information flows both ways.",
      p2:
        "Each district is led by a District Committee Member (DCM), who is elected by the General Service Representatives (GSRs) of the groups within the district. The DCM coordinates district activities, represents the district at Area meetings, and helps GSRs carry out their responsibilities.",
      p3:
        "District meetings are held regularly and are open to all A.A. members. These meetings provide opportunities for GSRs to share experience, discuss district business, and plan local service activities.",
      learnMore: "Learn more about service structure",
      learnMoreHref: "/service",
    },
  },
  directory: districtDirectory,
} satisfies ContentDoc

export const CONTENT_SCHEMAS: Record<Scope, ContentSchema> = {
  global: {
    scope: "global",
    title: "Global",
    description: "Shared content used across the site: header, footer, and common labels.",
    defaultsEn: globalDefaultsEn,
    sections: [
      {
        id: "global.header.brand",
        title: "Header Branding",
        fields: [
          { path: "header.brand.title", label: "Title", type: "text" },
          { path: "header.brand.subtitle", label: "Subtitle", type: "text" },
        ],
      },
      {
        id: "global.header.nav",
        title: "Header Navigation Labels",
        description: "Labels only (routes stay in code).",
        fields: [
          { path: "header.nav.home", label: "Home", type: "text" },
          { path: "header.nav.events", label: "Events", type: "text" },
          { path: "header.nav.about.label", label: "About (menu label)", type: "text" },
          { path: "header.nav.about.aboutArea36", label: "About Area 36", type: "text" },
          { path: "header.nav.about.committeesOfficers", label: "Committees & Officers", type: "text" },
          { path: "header.nav.about.districts", label: "Districts", type: "text" },
          { path: "header.nav.resources.label", label: "Resources (menu label)", type: "text" },
          { path: "header.nav.resources.documentsForms", label: "Documents & Forms", type: "text" },
          { path: "header.nav.resources.newsletter", label: "Newsletter", type: "text" },
          { path: "header.nav.resources.recordings", label: "Recordings", type: "text" },
          { path: "header.nav.resources.generalServiceConference", label: "General Service Conference", type: "text" },
          { path: "header.nav.resources.serviceBasics", label: "Service Basics", type: "text" },
          { path: "header.nav.resources.temporaryContactProgram", label: "Temporary Contact Program", type: "text" },
          { path: "header.nav.resources.forProfessionals", label: "For Professionals", type: "text" },
          { path: "header.nav.resources.grapevine", label: "Grapevine & La Viña", type: "text" },
          { path: "header.nav.ypaa", label: "YPAA", type: "text" },
          { path: "header.nav.contribute", label: "Contribute", type: "text" },
          { path: "header.nav.contact", label: "Contact", type: "text" },
        ],
      },
      {
        id: "global.footer",
        title: "Footer",
        fields: [
          { path: "footer.brand.title", label: "Brand title", type: "text" },
          { path: "footer.brand.subtitle", label: "Brand subtitle", type: "text" },
          { path: "footer.blurb", label: "Blurb", type: "textarea", rows: 4 },
          { path: "footer.titles.aaResources", label: "Section title: A.A. Resources", type: "text" },
          { path: "footer.titles.area", label: "Section title: Area 36", type: "text" },
          { path: "footer.titles.contact", label: "Section title: Contact", type: "text" },
          { path: "footer.quickLinks.findMeeting.label", label: "Quick link: Find a Meeting (label)", type: "text" },
          { path: "footer.quickLinks.findMeeting.href", label: "Quick link: Find a Meeting (URL)", type: "text" },
          { path: "footer.quickLinks.aaOrg.label", label: "Quick link: AA.org (label)", type: "text" },
          { path: "footer.quickLinks.aaOrg.href", label: "Quick link: AA.org (URL)", type: "text" },
          { path: "footer.quickLinks.gso.label", label: "Quick link: General Service Office (label)", type: "text" },
          { path: "footer.quickLinks.gso.href", label: "Quick link: General Service Office (URL)", type: "text" },
          { path: "footer.quickLinks.grapevine.label", label: "Quick link: Grapevine (label)", type: "text" },
          { path: "footer.quickLinks.grapevine.href", label: "Quick link: Grapevine (URL)", type: "text" },
          { path: "footer.areaLinks.events.label", label: "Area link: Events Calendar (label)", type: "text" },
          { path: "footer.areaLinks.events.href", label: "Area link: Events Calendar (URL)", type: "text" },
          { path: "footer.areaLinks.committees.label", label: "Area link: Committees & Officers (label)", type: "text" },
          { path: "footer.areaLinks.committees.href", label: "Area link: Committees & Officers (URL)", type: "text" },
          { path: "footer.areaLinks.districts.label", label: "Area link: Districts (label)", type: "text" },
          { path: "footer.areaLinks.districts.href", label: "Area link: Districts (URL)", type: "text" },
          { path: "footer.areaLinks.resources.label", label: "Area link: Resources (label)", type: "text" },
          { path: "footer.areaLinks.resources.href", label: "Area link: Resources (URL)", type: "text" },
          { path: "footer.areaLinks.newsletter.label", label: "Area link: Newsletter (label)", type: "text" },
          { path: "footer.areaLinks.newsletter.href", label: "Area link: Newsletter (URL)", type: "text" },
          { path: "footer.areaLinks.service.label", label: "Area link: Service Basics (label)", type: "text" },
          { path: "footer.areaLinks.service.href", label: "Area link: Service Basics (URL)", type: "text" },
          { path: "footer.areaLinks.ypaa.label", label: "Area link: YPAA (label)", type: "text" },
          { path: "footer.areaLinks.ypaa.href", label: "Area link: YPAA (URL)", type: "text" },
          { path: "footer.areaLinks.contribute.label", label: "Area link: Contribute (label)", type: "text" },
          { path: "footer.areaLinks.contribute.href", label: "Area link: Contribute (URL)", type: "text" },
          { path: "footer.contact.addressLines.0", label: "Contact address line 1", type: "text" },
          { path: "footer.contact.addressLines.1", label: "Contact address line 2", type: "text" },
          { path: "footer.contact.addressLines.2", label: "Contact address line 3", type: "text" },
          { path: "footer.contact.emailLabel", label: "Contact email label", type: "text" },
          { path: "footer.contact.emailHref", label: "Contact email link", type: "text" },
          { path: "footer.bottom.aslResources", label: "Bottom link: ASL Resources", type: "text" },
          { path: "footer.bottom.accessibility", label: "Bottom link: Accessibility", type: "text" },
          { path: "footer.bottom.opensNewTab", label: "External-link hint", type: "text" },
          { path: "footer.bottom.copyright", label: "Copyright line (use {year})", type: "text" },
        ],
      },
    ],
  },
  home: {
    scope: "home",
    title: "Home",
    description: "Homepage hero and quick-access content.",
    defaultsEn: homeDefaultsEn,
    sections: [
      {
        id: "home.hero",
        title: "Hero",
        fields: [
          { path: "hero.headingPrefix", label: "Heading (prefix)", type: "text" },
          { path: "hero.headingAccent", label: "Heading (accent)", type: "text" },
          { path: "hero.intro", label: "Intro", type: "textarea", rows: 4 },
          { path: "hero.buttons.events.label", label: "Primary button label", type: "text" },
          { path: "hero.buttons.events.href", label: "Primary button URL", type: "text" },
          { path: "hero.buttons.meeting.label", label: "Secondary button label", type: "text" },
          { path: "hero.buttons.meeting.href", label: "Secondary button URL", type: "text" },
        ],
      },
      {
        id: "home.quickCards",
        title: "Quick Access Cards",
        fields: [
          { path: "hero.quickCards.events.title", label: "Card: Upcoming Events (title)", type: "text" },
          { path: "hero.quickCards.events.description", label: "Card: Upcoming Events (description)", type: "textarea", rows: 2 },
          { path: "hero.quickCards.events.href", label: "Card: Upcoming Events (URL)", type: "text" },
          { path: "hero.quickCards.newsletter.title", label: "Card: Newsletter (title)", type: "text" },
          { path: "hero.quickCards.newsletter.description", label: "Card: Newsletter (description)", type: "textarea", rows: 2 },
          { path: "hero.quickCards.newsletter.href", label: "Card: Newsletter (URL)", type: "text" },
          { path: "hero.quickCards.resources.title", label: "Card: Resources (title)", type: "text" },
          { path: "hero.quickCards.resources.description", label: "Card: Resources (description)", type: "textarea", rows: 2 },
          { path: "hero.quickCards.resources.href", label: "Card: Resources (URL)", type: "text" },
          { path: "hero.quickCards.involved.title", label: "Card: Get Involved (title)", type: "text" },
          { path: "hero.quickCards.involved.description", label: "Card: Get Involved (description)", type: "textarea", rows: 2 },
          { path: "hero.quickCards.involved.href", label: "Card: Get Involved (URL)", type: "text" },
        ],
      },
    ],
  },
  districts: {
    scope: "districts",
    title: "Districts",
    description: "District directory, meeting details, map embed, and page copy.",
    defaultsEn: districtsDefaultsEn,
    sections: [
      {
        id: "districts.page",
        title: "Page Copy",
        fields: [
          { path: "page.title", label: "Title", type: "text" },
          { path: "page.intro", label: "Intro", type: "textarea", rows: 4 },
          { path: "page.allTitle", label: 'All districts heading (use "{count}")', type: "text" },
          { path: "page.searchPlaceholder", label: "Search placeholder", type: "text" },
          { path: "page.searchAriaLabel", label: "Search aria-label", type: "text" },
          { path: "page.badges.open", label: "Badge: DCM position open", type: "text" },
          { path: "page.badges.spanish", label: "Badge: Spanish speaking", type: "text" },
          { path: "page.labels.location", label: "Label: Location", type: "text" },
          { path: "page.labels.dcm", label: "Label: DCM", type: "text" },
          { path: "page.labels.districtMeeting", label: "Label: District Meeting", type: "text" },
          { path: "page.labels.citiesPrefix", label: "Label: Cities prefix", type: "text" },
          { path: "page.labels.actions", label: "Label: Actions", type: "text" },
          { path: "page.labels.positionOpen", label: "Text: Position currently open", type: "text" },
          { path: "page.actions.emailDcm", label: "Action: Email DCM", type: "text" },
          { path: "page.actions.visitWebsite", label: "Action: Visit District Website", type: "text" },
          { path: "page.actions.directions", label: "Action: Get Directions", type: "text" },
          { path: "page.actions.noActions", label: "Action fallback text", type: "textarea", rows: 2 },
          { path: "page.empty.noResults", label: 'Empty state (use "{query}")', type: "text" },
          { path: "page.about.title", label: "About section title", type: "text" },
          { path: "page.about.p1", label: "About paragraph 1", type: "textarea", rows: 3 },
          { path: "page.about.p2", label: "About paragraph 2", type: "textarea", rows: 3 },
          { path: "page.about.p3", label: "About paragraph 3", type: "textarea", rows: 3 },
          { path: "page.about.learnMore", label: "About link label", type: "text" },
          { path: "page.about.learnMoreHref", label: "About link href", type: "text" },
        ],
      },
      {
        id: "districts.map",
        title: "Map Embed",
        fields: [
          { path: "page.map.iframeSrc", label: "Map iframe src", type: "text" },
          { path: "page.map.iframeTitle", label: "Map iframe title", type: "text" },
          { path: "page.map.sectionAriaLabel", label: "Map section aria-label", type: "text" },
          { path: "page.map.sectionAriaLabelList", label: "List section aria-label", type: "text" },
        ],
      },
      {
        id: "districts.directory",
        title: "District Directory",
        description:
          "English is the source of truth for the district directory data. Other locales inherit from English unless overridden.",
        fields: [
          {
            path: "directory",
            label: "Directory JSON",
            help:
              "Array of districts. Edit carefully: meetingDay supports patterns like \"3rd Wednesday\" (used to derive monthly meeting occurrences).",
            type: "json",
            translatable: false,
          },
        ],
      },
    ],
  },
}
