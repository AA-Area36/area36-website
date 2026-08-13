import type { Locale } from "@/lib/i18n/locales"
import { districtDirectory } from "@/lib/constants/district-directory"

export type Scope =
  | "global"
  | "home"
  | "districts"
  | "about"
  | "committees"
  | "contact"
  | "contribute"
  | "correctionsTcp"
  | "events"
  | "generalServiceConference"
  | "grapevine"
  | "newsletter"
  | "professionals"
  | "recordings"
  | "reports"
  | "resources"
  | "serviceBasics"
  | "temporaryContactPrograms"
  | "treatmentTcp"
  | "ypaa"

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

function humanizeToken(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function inferFieldType(value: string): FieldType {
  if (value.includes("\n")) return "textarea"
  if (value.length > 110) return "textarea"
  return "text"
}

function collectStringLeafFields(value: unknown, path: string): ContentField[] {
  if (typeof value === "string") {
    return [
      {
        path,
        label: humanizeToken(path.split(".").join(" ")),
        type: inferFieldType(value),
        rows: inferFieldType(value) === "textarea" ? 3 : undefined,
      },
    ]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStringLeafFields(item, `${path}.${index}`))
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => collectStringLeafFields(child, `${path}.${key}`))
  }

  return []
}

function buildSectionsFromTopLevel(
  scope: Scope,
  defaults: ContentDoc,
  titleOverrides: Record<string, string> = {},
): ContentSection[] {
  return Object.entries(defaults)
    .map(([key, value]) => ({
      id: `${scope}.${key}`,
      title: titleOverrides[key] ?? humanizeToken(key),
      fields: collectStringLeafFields(value, key),
    }))
    .filter((section) => section.fields.length > 0)
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
      service: { label: "Service Basics", href: "/service-basics" },
      ypaa: { label: "YPAA", href: "/ypaa" },
      professionals: { label: "For Professionals", href: "/professionals" },
      gsc: { label: "General Service Conference", href: "/general-service-conference" },
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
      involved: { title: "Get Involved", description: "Learn about service and how to participate.", href: "/service-basics" },
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
      contributions: "Contributions",
      citiesPrefix: "Cities:",
      actions: "Actions",
      positionOpen: "Position currently open",
      at: "at",
      countiesMore: "+{count} more",
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
      learnMoreHref: "/service-basics",
    },
  },
  directory: districtDirectory,
} satisfies ContentDoc

const pagesDefaultsEn = {
  about: {
    header: {
      title: "About Area 36",
      description:
        "Southern Minnesota Area 36 serves as the General Service structure for Alcoholics Anonymous in southern Minnesota, connecting groups to A.A. as a whole.",
    },
    mission: {
      title: "Our Purpose",
      paragraph1:
        "The primary purpose of Area 36 is to facilitate communication within the area and between Area 36 and A.A. members. We serve as a vital link in the chain that connects individual A.A. groups to the General Service Conference and A.A. World Services.",
      paragraph2:
        "Through assemblies, workshops, and service committees, we work together to carry the message of Alcoholics Anonymous and ensure that our fellowship remains available to all who need it.",
      committeesLinkLabel: "View our Committees & Officers",
    },
    values: {
      unity: {
        title: "Unity",
        description: "Working together for our common purpose of carrying the A.A. message.",
      },
      service: {
        title: "Service",
        description: "Giving back to the fellowship that saved our lives.",
      },
      recovery: {
        title: "Recovery",
        description: "Supporting the primary purpose of each A.A. group.",
      },
      tradition: {
        title: "Tradition",
        description: "Guided by our Twelve Traditions in all our affairs.",
      },
    },
    structure: {
      title: "Area Structure",
      description:
        "Area 36 is organized into districts, each with elected service positions that work together to serve A.A. groups throughout southern Minnesota.",
      learnMoreLabel: "Learn more →",
      officers: {
        title: "Area Officers",
        items: [
          "Delegate",
          "Alternate Delegate",
          "Chair",
          "Alternate Chair",
          "Secretary",
          "Treasurer",
        ],
      },
      committees: {
        title: "Standing Committees",
        items: [
          "Accessibilities",
          "Archives",
          "CPC",
          "Corrections",
          "Finance",
          "Grapevine",
          "Literature",
          "Newsletter",
          "PI",
          "Registrar",
          "Structure",
          "Technology",
          "Treatment",
        ],
      },
      districts: {
        title: "Districts",
        items: ["26 Geographic Districts", "1 Linguistic District (Spanish)", "DCMs", "GSRs"],
      },
    },
    accessibility: {
      title: "Accessibility Commitment",
      intro:
        "Area 36 is committed to ensuring that A.A. is accessible to all alcoholics, regardless of ability. Our website and events strive to meet WCAG accessibility guidelines.",
      websiteFeaturesTitle: "Website Features",
      websiteFeatures: [
        "High contrast color schemes",
        "Adjustable text sizing",
        "Dark mode support",
        "Screen reader compatibility",
        "Keyboard navigation",
      ],
      eventAccessibilityTitle: "Event Accessibility",
      eventAccessibility: [
        "ASL interpretation available on request",
        "Wheelchair accessible venues",
        "Hybrid/online meeting options",
        "Large print materials",
      ],
      requestText: "To request accommodations for an Area 36 event, please contact the",
      requestLinkLabel: "Accessibilities Committee",
    },
    professionals: {
      title: "For Professionals",
      intro:
        "Are you a professional looking for more information about Alcoholics Anonymous in southern Minnesota? A.A. cooperates with professionals who work with alcoholics, including healthcare providers, clergy, educators, and others.",
      resourcesTitle: "Resources",
      links: {
        infoForProfessionals: "A.A. Information for Professionals",
        literature: "A.A. Literature",
        areaResources: "Area 36 Resources for Professionals",
      },
      contactButtonLabel: "Contact Us",
    },
  },
  committees: {
    header: {
      title: "Committees & Officers",
      description:
        "Area 36 is served by elected officers and standing committees, all working together to carry the message of Alcoholics Anonymous throughout southern Minnesota.",
    },
    officersSection: {
      title: "Area Officers",
      description:
        "Elected officers serve two-year terms and are responsible for the overall operations of the Area.",
      interimLabel: "(Interim)",
    },
    officers: {
      delegate: {
        role: "Delegate",
        name: "Doug H.",
        email: "delegate@area36.org",
        description:
          "The GSC delegate is elected every odd-numbered year to represent the area at the annual meeting of the conference in New York, and to bring back to the area the results of the Conference meeting.",
      },
      alternateDelegate: {
        role: "Alternate Delegate",
        name: "Jennifer A.",
        email: "altdelegate@area36.org",
        description:
          "The alternate delegate serves as a valuable assistant, often traveling with the delegate or giving reports. In Area 36, the alternate delegate also serves as the Structure Committee Chair.",
      },
      chairperson: {
        role: "Chairperson",
        name: "Matt B.",
        email: "chairperson@area36.org",
        description:
          "The Area Chair presides at Area Assembly and Area Committee meetings, sets the agenda, appoints committee chairpersons, and prepares the annual budget.",
      },
      alternateChairperson: {
        role: "Alternate Chairperson",
        name: "Eric M.",
        email: "altchairperson@area36.org",
        description:
          "The Alternate Area Chair works closely with the Area Chair and presides over meetings when the Chair is unable to attend. Also serves as the Finance Committee Chair.",
      },
      secretary: {
        role: "Secretary",
        name: "Jennifer G.",
        email: "secretary@area36.org",
        description:
          "The Secretary records the minutes of Area Assemblies, Area Committee Meetings, and Area Officer meetings, and develops agenda material for Area Assemblies.",
      },
      treasurer: {
        role: "Treasurer",
        name: "Nora H.",
        email: "treasurer@area36.org",
        description:
          "The Treasurer handles all area monies, keeping records of contributions and disbursements according to the Area Financial Guidelines.",
      },
    },
    committeesSection: {
      title: "Standing Committees",
      description:
        "Standing committees focus on specific areas of service and are open to all interested A.A. members.",
    },
    committeeUi: {
      chairLabel: "Chair",
      contactCommitteeLabel: "Contact Committee",
      archivistLabel: "Area Archivist",
      webmasterLabel: "Webmaster",
      relatedLinkLabel: "Learn more",
      resourcesTitle: "Resources",
      pinkCanFormsTitle: "Pink Can Plan Forms",
      correctionsDatabaseTitle: "Corrections Database",
      loadingFilesLabel: "Loading committee files...",
    },
    committeesData: {
      accessibilities: {
        name: "Accessibilities",
        slug: "accessibilities",
        chairName: "Dan H.",
        email: "accessibilities@area36.org",
        descriptionParagraphs: [
          "Greetings, and welcome to the Accessibilities Committee page. Quite often the first question is \"What exactly constitutes a remote community?\" and \"What does the Accessibilities committee actually do?\".",
          "The definition of Accessibilities community is where it is difficult to carry the AA message because of language, culture, geography, or life condition. As you can see that applies equally as well to communities in the most rural parts of the Area as it does to communities in the heart of Minneapolis who, for a range of reasons, are not getting AA's message. Thus, the central mission of this committee is to go to any lengths necessary to carry AA's message to all those who need it and is just one more link in the chain or responsibility in our effort to help the alcoholic to who still suffers.",
          "At first glance it may seem that this committee reproduces some of the work of the PI or CPC committees. In reality, while the RC does work closely with these two committees, the RC serves a different need and helps fill the gap in our Area's overall 12-step work by reaching out to various communities that might not fall under the responsibility of the other area committees.",
        ],
      },
      archives: {
        name: "Archives",
        slug: "archives",
        chairName: "",
        email: "archives@area36.org",
        archivistName: "Vince F.",
        archivistEmail: "archivist@area36.org",
        description:
          "The Archives Committee gathers current and historical information about A.A., especially in our Area and preserves it in a meaningful order. This committee provides a clearinghouse of information in the Area with respect to Archives, coordinating the exchange of ideas and resources between districts. Provides experience and assistance in developing projects that will further the carrying of our A.A. message with respect to Archives.",
      },
      cpc: {
        name: "Cooperation with the Professional Community (CPC)",
        slug: "cpc",
        chairName: "Jim M.",
        email: "cpc@area36.org",
        description:
          "Works with A.A. groups to provide information on Alcoholics Anonymous to professionals who often meet alcoholics before we do.",
      },
      corrections: {
        name: "Corrections",
        slug: "corrections",
        chairName: "Dave A.",
        email: "corrections@area36.org",
        description:
          "Coordinates the work of A.A. groups in carrying the A.A. message to alcoholics in correctional facilities. Manages the Temporary Contact Program and the Pink Can Plan for literature distribution.",
        additionalContacts: [
          { role: "Temporary Contact Coordinator", name: "Brian M.", email: "ctcp@area36.org" },
          { role: "Pink Can Coordinator", name: "Patrick W.", email: "pinkcanplan@area36.org" },
        ],
        infoCards: [
          {
            title: "Submit Pink Can Plan Orders",
            content: "Mail completed forms to the address below or email them to the Pink Can Coordinator.",
            email: "pinkcanplan@area36.org",
            address: "Pink Can Plan\nPO Box 41633\nPlymouth, MN 55441-0633",
          },
          {
            title: "Corrections Database",
            content:
              "This database contains information about the correctional facilities in Minnesota. Only those with an Area36.org email account can access this database. The database is also password protected. Contact the Corrections Chair about the password.",
            link: {
              url: "https://drive.google.com/file/d/1c6XjH6ODGmRAbFKEEL0APvMza3P9oZYE/view?usp=sharing",
              label: "Access Database",
            },
          },
        ],
      },
      finance: {
        name: "Finance",
        slug: "finance",
        chairName: "Eric M.",
        email: "finance@area36.org",
        description:
          "Monitors the Area's financial needs, policies and practices. Responsible for reminding groups of their Seventh Tradition opportunities. Reviews and updates the Area financial guidelines as needed.",
      },
      grapevine: {
        name: "Grapevine",
        slug: "grapevine",
        chairName: "Tom W.",
        email: "grapevine@area36.org",
        description:
          "Coordinates the work of A.A. members, groups, and districts to read, subscribe to and utilize the Grapevine and Grapevine-produced materials. Encourages members to contribute written material for publication.",
      },
      literature: {
        name: "Literature",
        slug: "literature",
        chairName: "Andy J.",
        email: "literature@area36.org",
        description:
          "Provides information to A.A. members and groups encouraging the use of Conference approved literature and maintains inventory of the Area literature.",
      },
      newsletter: {
        name: "Newsletter",
        slug: "newsletter",
        chairName: "Joe S.",
        email: "newsletter@area36.org",
        description:
          "Publishes The Pigeon four times a year, an informative newsletter about service activities and opportunities throughout the Area.",
      },
      pi: {
        name: "Public Information (PI)",
        slug: "pi",
        chairName: "",
        email: "pi@area36.org",
        description:
          "Increases awareness of A.A. in the general public. Also monitors anonymity breaks at the level of press, radio and film.",
      },
      registrar: {
        name: "Registrar",
        slug: "registrar",
        chairName: "Justin P.",
        email: "registrar@area36.org",
        description:
          "Maintains an accurate database and mailing list of the groups and trusted servants in the Area. This database is used for mailing lists, the Area Directory, and group listings.",
      },
      structure: {
        name: "Structure",
        slug: "structure",
        chairName: "Jennifer A.",
        email: "structure@area36.org",
        description:
          "Reviews how the area functions internally on a continual basis. The Alternate Delegate serves as the Structure Committee Chair.",
      },
      technology: {
        name: "Technology",
        slug: "technology",
        chairName: "Becky N.",
        email: "technology@area36.org",
        webmasterName: "Josh G.",
        webmasterEmail: "webmaster@area36.org",
        description:
          "Develops and maintains the Area website, ensuring information is kept current. Addresses technical issues including errors, broken links, and missing documents.",
      },
      treatment: {
        name: "Treatment",
        slug: "treatment",
        chairName: "Brad S.",
        email: "treatment@area36.org",
        descriptionParagraphs: [
          "The Treatment Facilities Committee leads and coordinates the work of AA members and groups in carrying the A.A. message to alcoholics in treatment facilities.",
          "A.A. TEMPORARY CONTACT VOLUNTEERS",
          "A TEMPORARY CONTACT is a member of Alcoholics Anonymous who works with alcoholics both in and coming out of treatment facilities/programs.",
          "THE PRIMARY PURPOSE IS TO HELP THEM BRIDGE THE GAP TO ALCOHOLICS ANONYMOUS.",
          "It is a short term arrangement (30 - 90 days) until the new member has become established in a group and has found permanent sponsorship.",
          "The TEMPORARY CONTACT may do such things as visit the alcoholic before they leave the facility, provide them with AA conference approved literature and a local meeting list, let them know about the AA Grapevine magazine, how to subscribe and possibly give them a couple of old Grapevine issues, visit with them for one on one sharing, take them to a variety of meetings before and after they leave (especially their first day back in the community), meet them at meetings, introduce them to as many AA's as possible, help them into the after meeting coffee groups, call them, ensure they have the phone numbers of several AA's, talk with them about sponsorship and guide them to selecting a more permanent sponsor and a home group.",
          "The TEMPORARY CONTACT must ensure that their information on the contact list is current and accurate.",
          "TEMPORARY CONTACTS will be called upon to help a prospect/patient by matching their ZIP codes, gender and age group whenever possible.",
          "The volunteer lists may be made available to Intergroups, District and Area committees. A call may come from any of these sources in addition to directly from a prospective member.",
        ],
        additionalContacts: [
          { role: "Temporary Contact Coordinator", name: "Patrick S.", email: "ttcc@area36.org" },
        ],
        relatedPageUrl: "/treatment-temporary-contact-program",
        relatedPageText: "Fill out volunteer or newcomer forms",
      },
    },
    getInvolved: {
      title: "Get Involved in Service",
      description:
        "All committee meetings are open to any interested A.A. member. Service is a vital part of recovery and a great way to give back to the fellowship that helped you.",
      serviceBasicsLinkLabel: "Learn about service basics →",
      contactLinkLabel: "Contact us to get started →",
    },
  },
  contact: {
    header: {
      title: "Contact Us",
      description: "Have questions about Area 36 or general service? Select who you'd like to contact and send us a message.",
    },
    form: {
      title: "Send a Message",
      recipientsLabel: "Who would you like to contact?",
      recipientsPlaceholder: "Select recipients",
      selectedRecipientsLabel: "Selected recipients",
      firstNameLabel: "First Name",
      lastNameLabel: "Last Name",
      emailLabel: "Email",
      phoneLabel: "Phone Number",
      subjectLabel: "Subject",
      subjectPlaceholder: "Brief subject line",
      messageLabel: "Message",
      recaptchaNotice: "This form is protected by Google reCAPTCHA v3.",
      consentText:
        "I understand that A.A. is a program of anonymity and that my contact information will be kept confidential.",
      sendingLabel: "Sending...",
      sendButtonLabel: "Send Message",
      recaptchaNotLoadedError: "reCAPTCHA not loaded. Please refresh and try again.",
      genericError: "An error occurred",
      recaptchaErrorPrefix: "reCAPTCHA error:",
      successTitle: "Message Sent!",
      successPrefix: "Thank you for your message.",
      successFallback:
        "Your selected recipients will get back to you soon.",
      successSuffix: "will get back to you soon.",
      sendAnotherLabel: "Send Another Message",
    },
    recipients: {
      general: { label: "General Inquiry", email: "chairperson@area36.org" },
      chairperson: { label: "Area Chairperson", email: "chairperson@area36.org" },
      delegate: { label: "Delegate", email: "delegate@area36.org" },
      treasurer: { label: "Treasurer", email: "treasurer@area36.org" },
      secretary: { label: "Secretary", email: "secretary@area36.org" },
      technology: { label: "Technology Chair", email: "technology@area36.org" },
      webmaster: { label: "Webmaster", email: "webmaster@area36.org" },
      accessibility: { label: "Accessibility Committee", email: "accessibility@area36.org" },
      archives: { label: "Archives Committee", email: "archives@area36.org" },
      cpc: { label: "CPC Committee", email: "cpc@area36.org" },
      corrections: { label: "Corrections Committee", email: "corrections@area36.org" },
      grapevine: { label: "Grapevine Committee", email: "grapevine@area36.org" },
      literature: { label: "Literature Committee", email: "literature@area36.org" },
      pi: { label: "Public Information Committee", email: "pi@area36.org" },
      treatment: { label: "Treatment Committee", email: "treatment@area36.org" },
    },
    contactInfo: {
      mailingAddressTitle: "Mailing Address",
      mailingAddressLine1: "SMAA",
      mailingAddressLine2: "P.O. Box 2812",
      mailingAddressLine3: "Minneapolis, MN 55402",
      directContactsTitle: "Direct Email Contacts",
      officersTitle: "Area Officers",
      committeesTitle: "Committee Chairs",
      immediateHelpTitle: "Need Immediate Help?",
      immediateHelpBody:
        "If you or someone you know is struggling with alcohol, the most important thing is to find a meeting.",
      immediateHelpButtonLabel: "Find a Meeting",
    },
    officers: {
      delegate: { role: "Delegate", description: "GSC representative", email: "delegate@area36.org" },
      alternateDelegate: { role: "Alternate Delegate", description: "Assists Delegate", email: "altdelegate@area36.org" },
      chairperson: { role: "Chairperson", description: "Area leadership", email: "chairperson@area36.org" },
      alternateChair: { role: "Alternate Chair", description: "Assists Chair", email: "altchairperson@area36.org" },
      secretary: { role: "Secretary", description: "Area records", email: "secretary@area36.org" },
      treasurer: { role: "Treasurer", description: "Financial matters", email: "treasurer@area36.org" },
    },
    committees: {
      accessibility: { name: "Accessibility", email: "accessibility@area36.org" },
      archives: { name: "Archives", email: "archives@area36.org" },
      cpc: { name: "CPC", email: "cpc@area36.org" },
      corrections: { name: "Corrections", email: "corrections@area36.org" },
      grapevine: { name: "Grapevine / La Viña", email: "grapevine@area36.org" },
      groupRecords: { name: "Group Records", email: "grouprecords@area36.org" },
      literature: { name: "Literature", email: "literature@area36.org" },
      pi: { name: "Public Information", email: "pi@area36.org" },
      technology: { name: "Technology", email: "technology@area36.org" },
      treatment: { name: "Treatment", email: "treatment@area36.org" },
      website: { name: "Website", email: "webmaster@area36.org" },
    },
  },
  contribute: {
    header: {
      title: "Contribute",
      description:
        "Supporting Area 36 through the Seventh Tradition helps carry the message of Alcoholics Anonymous throughout southern Minnesota.",
    },
    membershipCheck: {
      title: "Before You Contribute",
      question: "Are you a member of Alcoholics Anonymous?",
      yesLabel: "Yes, I am an A.A. member",
      noLabel: "No",
      notMemberTitle: "Thank You for Your Interest",
      notMemberBody:
        "Thank you for your interest in supporting Alcoholics Anonymous. However, in keeping with A.A.'s Seventh Tradition of self-support, we accept contributions only from A.A. members.",
      notMemberHelpPrefix:
        "If you or someone you know needs help with a drinking problem, please visit",
      notMemberHelpSuffix: "to find a meeting near you.",
      goBackLabel: "Go Back",
      proceedMessage: "Thank you. Please scroll down to view contribution options.",
      changeAnswerLabel: "Change answer",
    },
    tradition: {
      title: "The Seventh Tradition",
      shortFormTitle: "Short Form",
      shortFormQuote:
        "\"Every A.A. group ought to be fully self-supporting, declining outside contributions.\"",
      longFormTitle: "Long Form",
      longFormQuote:
        "\"The A.A. groups themselves ought to be fully supported by the voluntary contributions of their own members. We think that each group should soon achieve this ideal; that any public solicitation of funds using the name of Alcoholics Anonymous is highly dangerous, whether by groups, clubs, hospitals, or other outside agencies; that acceptance of large gifts from any source, or of contributions carrying any obligation whatever, is unwise. Then too, we view with much concern those A.A. treasuries which continue, beyond prudent reserves, to accumulate funds for no stated A.A. purpose. Experience has often warned us that nothing can so surely destroy our spiritual heritage as futile disputes over property, money, and authority.\"",
      paragraph1:
        "The Seventh Tradition ensures that A.A. remains independent and free from outside influences. When we contribute to the work of A.A., we help support the services that made our recovery possible and ensure they will be available to others.",
      paragraph2:
        "Contributions to Area 36 help fund assemblies, workshops, delegate expenses, literature, and the many service activities that carry the A.A. message across southern Minnesota.",
      usageTitle: "How Contributions Are Used",
      usageItems: [
        "Area Assemblies and Committee Meetings",
        "Delegate expenses to General Service Conference",
        "Literature and service materials",
        "Communication and outreach",
        "Public Information and CPC activities",
        "Accessibility services and translation",
      ],
    },
    methods: {
      title: "Ways to Contribute",
      mail: {
        title: "By Mail",
        subtitle: "Send a check payable to \"SMAA\"",
        addressLine1: "Southern Minnesota Area Assembly",
        addressLine2: "P.O. Box 2812",
        addressLine3: "Minneapolis, MN 55402",
        note:
          "Please include your group name and number (if applicable) on the check memo line.",
      },
      online: {
        title: "Online",
        subtitle: "Contribute securely online via PayPal",
        buttonLabel: "Contribute via PayPal",
        directIntro: "Or send directly via PayPal app/website to:",
        directEmail: "treasurer@area36.org",
        notesTitle: "In the PayPal notes, please include:",
        noteItems: [
          "Type: Group, Individual, Birthday, or Pink Can Plan",
          "Group name and service ID (if group contribution)",
          "For birthday contributions credited to your group, include group info",
        ],
        noteFooter:
          "Contributions acknowledged via email unless otherwise indicated.",
      },
      pinkCan: {
        title: "Pink Can Plan",
        subtitle: "Send a check payable to \"Pink Can Plan\"",
        addressLine1: "Pink Can Plan Coordinator",
        addressLine2: "PO Box 41633",
        addressLine3: "Plymouth, MN 55441-0633",
        body:
          "The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional facilities.",
      },
    },
    groupContributions: {
      title: "For Groups: Suggested Contribution Split",
      description:
        "After meeting expenses, many groups use the following suggested split for their Seventh Tradition contributions:",
      split: {
        district: { percent: "10%", recipient: "District", description: "Local service" },
        area: { percent: "30%", recipient: "Area 36", description: "Regional service" },
        intergroup: { percent: "50%", recipient: "Intergroup", description: "Local coordination" },
        gso: { percent: "10%", recipient: "GSO", description: "A.A. World Services" },
      },
      note:
        "This is a suggested split and may vary based on your group's conscience. The important thing is that your group contributes what it can to support A.A. at all levels.",
      gsoTitle: "GSO Contribution Address",
      gsoAddressLine1: "General Service Office",
      gsoAddressLine2: "P.O. Box 2407",
      gsoAddressLine3: "James A. Farley Station",
      gsoAddressLine4: "New York, NY 10116-2407",
      gsoOnlinePrefix: "Or contribute online at",
    },
    resources: {
      title: "Learn More About Self-Support",
      link1: "Self-Support: Where Money and Spirituality Mix",
      link2: "The A.A. Group Treasurer",
      link3: "Your Seventh Tradition Contributions",
    },
    thankYou: {
      title: "Thank You",
      description:
        "Your contributions help ensure that A.A.'s hand will always be there when the next suffering alcoholic reaches out for help. Thank you for supporting Area 36 and the work of Alcoholics Anonymous.",
    },
  },
  correctionsTcp: {
    header: {
      badge: "Corrections",
      title: "Corrections Temporary Contact Program",
      description: "Helping alcoholics transition from correctional facilities to the A.A. community.",
      backLinkLabel: "Back to Temporary Contact Programs",
    },
    page: {
      volunteerHeading: "Volunteer as a Temporary Contact",
      volunteerIntro1:
        "Complete this volunteer sign-up form to help people leaving correctional facilities connect with A.A. in their home community.",
      volunteerIntro2:
        "We use this information to find the best location match and support successful first-meeting connections.",
      volunteerIntro3: "You can also reach us directly at",
      formCardTitle: "Corrections Volunteer Sign Up",
      formCardDescription:
        "Required fields are marked with an asterisk. Please provide as much location detail as available.",
    },
    form: {
      firstNameLabel: "First Name",
      lastNameLabel: "Last Name",
      genderLabel: "Gender",
      genderPlaceholder: "Select gender",
      genderMale: "Male",
      genderFemale: "Female",
      birthYearLabel: "Birth Year",
      streetAddressLabel: "Street Address",
      cityLabel: "City",
      countyLabel: "County",
      stateLabel: "State",
      zipCodeLabel: "Zip Code",
      emailLabel: "Email",
      sobrietyDateLabel: "Sobriety Date",
      homeGroupLabel: "Home Group",
      phonePrimaryLabel: "Phone Number 1",
      phoneSecondaryLabel: "Phone Number 2",
      spanishSpeakingLabel: "I am Spanish-speaking.",
      otherLanguagesLabel: "Other Languages Spoken",
      notesLabel: "Additional Notes",
      recaptchaNotice: "This form is protected by Google reCAPTCHA v3.",
      submitLabel: "Submit Volunteer Sign Up",
      submittingLabel: "Submitting...",
      recaptchaNotLoadedError: "reCAPTCHA not loaded. Please refresh and try again.",
      genericError: "An error occurred",
      successTitle: "Volunteer Sign Up Received",
      successBody:
        "Thank you for volunteering. The Corrections TCP Coordinator will contact you soon.",
      successButtonLabel: "Submit Another Volunteer",
    },
    pinkCan: {
      title: "The Pink Can Plan",
      body1:
        "The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional facilities.",
      body2:
        "To learn more or contribute to the Pink Can Plan, contact the Pink Can Coordinator.",
    },
    committee: {
      title: "Corrections Committee",
      description:
        "For more information about corrections service work in Area 36, contact the committee.",
      emailButtonLabel: "corrections@area36.org",
      committeesButtonLabel: "View All Committees",
    },
  },
  events: {
    hero: {
      title: "Events Calendar",
      description: "Stay connected with Area 36 assemblies, workshops, and service events throughout southern Minnesota.",
    },
  },
  generalServiceConference: {
    header: {
      title: "General Service Conference",
      description: "Background materials, agenda items, advisory actions, and final reports from the General Service Conference.",
    },
    background: {
      title: "Background Material",
      description:
        "Every spring Alcoholics Anonymous holds a General Service Conference where discussions take place and decisions are voted on by area delegates, General Service Board trustees, and General Service Office staff. To help members of Alcoholics Anonymous come to an informed group conscience before the conference, the General Service Office prepares a list of agenda items along with background material for each item.",
      protectedTitle: "Password Protected Materials",
      protectedBody:
        "Some conference materials are password protected. If you need to know the password, please reach out to your District Committee Member (DCM). Please do not share these materials with people outside of Alcoholics Anonymous.",
    },
    advisoryActions: {
      title: "Conference Advisory Actions",
      description: "Advisory actions and agenda items from recent General Service Conferences.",
    },
    finalReports: {
      title: "Final Reports",
      description:
        "Complete final reports from past General Service Conferences, available in multiple languages.",
    },
  },
  grapevine: {
    header: {
      badge: "A.A. Publications",
      title: "AA Grapevine & La Viña",
      description:
        "The AA Grapevine and La Viña are the international journals of Alcoholics Anonymous, sharing the experience, strength, and hope of A.A. members in recovery.",
    },
    whatIs: {
      title: "What is the Grapevine?",
      paragraph1:
        "The AA Grapevine, often called \"our meeting in print,\" has been published continuously since June 1944. It is a monthly magazine written by A.A. members for A.A. members, featuring stories of recovery, articles on A.A. history, and reflections on the Steps and Traditions.",
      paragraph2:
        "La Viña is the Spanish-language counterpart to the Grapevine, serving the Hispanic A.A. community since 1996. Both publications operate as separate arms of A.A.'s General Service Board.",
      paragraph3:
        "Unlike other A.A. services, the Grapevine and La Viña are self-supporting through subscriptions and sales of related products. They do not accept group contributions, relying entirely on reader support.",
      quote: "\"The Grapevine is a mirror of A.A. thought and action worldwide.\"",
    },
    publications: {
      grapevine: {
        title: "AA Grapevine",
        subtitle: "The English-language A.A. magazine",
        body:
          "Available in print, digital, and audio formats. Features stories, articles, and Daily Reflections.",
        buttonLabel: "Visit AAGrapevine.org",
      },
      laVina: {
        title: "La Viña",
        subtitle: "The Spanish-language A.A. magazine",
        body:
          "Serving the Hispanic A.A. community with stories of recovery in Spanish since 1996.",
        buttonLabel: "Visit AALaVina.org",
      },
    },
    participate: {
      title: "Ways to Participate",
      subscribe: {
        title: "Subscribe",
        body:
          "Support the Grapevine by subscribing to the print or digital edition. Gift subscriptions are also available through the Carry the Message project.",
        linkLabel: "Visit the Grapevine Store",
      },
      share: {
        title: "Share Your Story",
        body:
          "The Grapevine is written by A.A. members. Consider sharing your experience, strength, and hope by submitting a story for publication.",
        linkLabel: "Submit Your Story",
      },
      representative: {
        title: "Become a GVR/RLV",
        body:
          "Your group can elect a Grapevine Representative (GVR) or La Viña Representative (RLV) to share information about these publications.",
        linkLabel: "Contact Area 36 Grapevine Committee",
      },
    },
    committee: {
      title: "Area 36 Grapevine Committee",
      description:
        "The Area 36 Grapevine Committee coordinates the work of A.A. members, groups, and districts to read, subscribe to, and utilize the Grapevine and Grapevine-produced materials. The committee also encourages members to contribute written material for publication.",
      contactButtonLabel: "Contact Grapevine Chair",
      committeesButtonLabel: "View All Committees",
    },
    cta: {
      title: "Explore the Grapevine",
      description:
        "Whether you subscribe, submit a story, or become a GVR, the Grapevine is a wonderful way to stay connected to the broader A.A. fellowship and share in the experience of recovery worldwide.",
      grapevineButtonLabel: "Visit Grapevine",
      laVinaButtonLabel: "Visit La Viña",
    },
  },
  newsletter: {
    header: {
      title: "The Pigeon",
      description:
        "The Pigeon is a General Service paper newsletter published four times a year by the Southern Minnesota Area Assembly of Alcoholics Anonymous. An anonymized digital version is available on this website.",
      secondaryDescription:
        "The Pigeon presents the experience and opinions of A.A. members and others interested in the A.A. program. Opinions expressed herein are not to be attributed to Alcoholics Anonymous as a whole, nor does publication of any article imply endorsement by either A.A. or the Southern MN Area Assembly.",
    },
    subscribe: {
      title: "Subscribe to The Pigeon",
      paragraph1:
        "There is no subscription fee; contributions from A.A. members, groups, and districts are welcome. Subscriptions are available, for free, in both snail mail and email format. The email version is anonymized.",
      paragraph2: "To subscribe to either format, please email both addresses below:",
    },
    submit: {
      title: "Submit an Article",
      paragraph1:
        "Articles and letters are invited, although no payment can be made, nor can contributed material be returned.",
      paragraph2:
        "All submissions may be emailed to the Newsletter Chair or sent via mail:",
    },
  },
  professionals: {
    header: {
      badge: "Information for Professionals",
      title: "For Professionals",
      description:
        "Professionals in many fields come into regular contact with alcoholics and may want more information about Alcoholics Anonymous. We would like to be of help to you!",
    },
    generalInfo: {
      title: "General Information",
      paragraph1:
        "General information about how A.A. can be of help to professionals can be found on the For Professionals page of AA.org. There you will find resources specifically designed for healthcare providers, legal professionals, educators, clergy, and others who work with alcoholics.",
      paragraph2:
        "A.A. does not provide medical advice, diagnose alcoholism, or offer professional treatment. However, we can share information about how A.A. works and how it has helped millions of people recover from alcoholism.",
      buttonLabel: "Visit AA.org For Professionals",
    },
    resourceCard: {
      title: "Resources from AA.org",
      description: "Materials designed specifically for professionals",
      links: {
        item1: "If You Are a Professional",
        item2: "A.A. as a Resource for Healthcare Professionals",
        item3: "A.A. as a Resource for Drug and Alcohol Court Professionals",
        item4: "About A.A. - Newsletter for Professionals",
        item5: "Understanding Anonymity",
      },
    },
    professions: {
      title: "A.A. Works With Many Professionals",
      healthcare: {
        title: "Healthcare",
        description:
          "Doctors, nurses, counselors, and mental health professionals often encounter patients who may benefit from A.A.",
      },
      legal: {
        title: "Legal",
        description:
          "Judges, attorneys, probation officers, and law enforcement professionals work with individuals who may need help with alcoholism.",
      },
      education: {
        title: "Education",
        description:
          "Teachers, school counselors, and administrators may encounter students or families affected by alcoholism.",
      },
      clergy: {
        title: "Clergy",
        description:
          "Pastors, chaplains, and religious leaders are often the first to hear from those struggling with alcohol problems.",
      },
    },
    southernMinnesota: {
      title: "Southern Minnesota Information",
      paragraph1:
        "For information specifically about how A.A. can be of help to professionals in southern Minnesota, please contact our Cooperation with the Professional Community (CPC) Committee Chair or any of the relevant Area 36 Committee Chairs and Officers.",
      paragraph2:
        "Our CPC Committee works to inform professionals about what A.A. is, what A.A. does, and what A.A. does not do. We are happy to provide presentations, literature, or answer questions about A.A. in our area.",
      cpcButtonLabel: "Contact CPC Committee",
      committeesButtonLabel: "View All Committees",
    },
    offer: {
      title: "What We Can Offer",
      description:
        "A.A. members are available to share information about the A.A. program, provide literature, speak to groups, and answer questions. We cannot provide professional advice, but we can share our experience.",
      contactButtonLabel: "Contact Area 36",
      meetingButtonLabel: "Find a Meeting",
    },
  },
  recordings: {
    header: {
      title: "Recordings",
      description:
        "Listen to audio recordings from Area 36 assemblies, delegate reports, and workshops. These recordings help carry the message of service to those who could not attend in person.",
      secondaryDescription:
        "All recordings are shared with permission and may be anonymized. The opinions expressed are those of the speakers and do not necessarily represent Alcoholics Anonymous as a whole.",
    },
    about: {
      title: "About These Recordings",
      paragraph1:
        "These audio recordings are provided as a service to help carry the message of Alcoholics Anonymous and general service. They include assembly presentations, delegate reports from the General Service Conference, and educational workshops.",
      paragraph2:
        "If you have questions about the recordings or would like to contribute, please contact the Area's Web Committee.",
    },
    usage: {
      title: "Using These Recordings",
      items: [
        "Click any recording to start playing. A player will appear at the bottom of the screen.",
        "Use the search bar to find specific topics or speakers.",
        "Filter by year to find recordings from a specific time period.",
        "Recordings can be played on any device with a web browser.",
      ],
    },
  },
  reports: {
    header: {
      title: "Monthly Reports",
      description: "Operational summaries for Area 36 web services, published monthly.",
    },
    list: {
      empty: "No reports available yet.",
      monthPrefix: "Month:",
      generatedPrefix: "Generated:",
      viewReportLabel: "View Report",
    },
  },
  resources: {
    header: {
      title: "Resources",
      description: "Access forms, documents, delegate reports, and other materials to support your service work in Area 36.",
    },
    quickLinks: {
      findMeeting: "Find a Meeting",
      newsletter: "Latest Newsletter",
      serviceBasics: "Service Basics",
      recordings: "Recordings",
      asl: "ASL Resources",
    },
    cards: {
      professionals: {
        title: "For Professionals",
        description:
          "Resources for healthcare providers, educators, clergy, and other professionals.",
        link1: "A.A. for Professionals (AA.org)",
        link2: "A.A. as a Resource for Healthcare",
        link3: "Area 36 Resources for Professionals →",
      },
      tcp: {
        title: "Temporary Contact Programs",
        description:
          "Bridging the Gap and pre-release contact information for those leaving treatment or corrections.",
        body:
          "Help newcomers make their first meeting by becoming a temporary contact or requesting a contact for someone you know.",
        tcpLink: "Learn About TCP →",
        treatmentLink: "Treatment TCP →",
        correctionsLink: "Corrections TCP →",
      },
      asl: {
        title: "ASL Resources",
        description: "Resources for deaf and hard of hearing members.",
        linkLabel: "A.A. Accessibility Resources",
        body:
          "To request ASL interpretation for an Area 36 event, please contact the Accessibility Committee.",
        contactLink: "Contact Accessibility Committee →",
      },
    },
    external: {
      title: "A.A. Resources",
      links: {
        aaOrg: { name: "AA.org", description: "Official A.A. website" },
        grapevine: { name: "AA Grapevine", description: "Meeting in print" },
        laVina: { name: "La Viña", description: "Spanish-language Grapevine" },
        findMeeting: { name: "Find a Meeting", description: "Meeting finder" },
      },
    },
  },
  serviceBasics: {
    header: {
      title: "Service Basics",
      description:
        "We're glad you're here! General Service is how individual A.A. groups connect to A.A. as a whole. Learn how you can get involved and carry the message.",
    },
    whyService: {
      title: "Why General Service?",
      paragraph1:
        "General Service is the activity of carrying A.A.'s message, as a whole fellowship, to the still-suffering alcoholic who hasn't yet found our program. It's the legacy of service that Bill W. and Dr. Bob left us.",
      paragraph2:
        "Through service, we ensure that A.A. will be here for future generations. Every member can participate, from making coffee at a meeting to representing their group at the General Service Conference.",
      quote:
        "\"Our Twelfth Step—carrying the message—is the basic service that the A.A. Fellowship gives; this is our principal aim and the main reason for our existence.\"",
      quoteSource: "— A.A. Service Manual",
      cards: {
        learn: {
          title: "Learn",
          description:
            "Study the service manual and attend workshops to understand how A.A. works.",
        },
        participate: {
          title: "Participate",
          description:
            "Attend district and area meetings. Your voice matters in the group conscience.",
        },
        share: {
          title: "Share",
          description:
            "Bring information back to your home group and encourage others to participate.",
        },
        grow: {
          title: "Grow",
          description:
            "Service positions at all levels help develop leadership and carry the message.",
        },
      },
    },
    positions: {
      title: "Service Positions",
      description:
        "General Service has a structure that allows the conscience of the fellowship to guide A.A.",
      cards: {
        gsr: {
          title: "General Service Representative (GSR)",
          description:
            "The GSR is elected by the group to represent its voice in A.A. as a whole. They attend district and area meetings, report back to the group, and help with group inventory.",
          timeCommitment: "Often 1-2 year term, monthly meetings",
        },
        dcm: {
          title: "District Committee Member (DCM)",
          description:
            "The DCM coordinates service activities in a district, supports GSRs, and serves as a link between groups and the area committee.",
          timeCommitment: "2-year term, monthly meetings + assemblies",
        },
        areaCommittee: {
          title: "Area Committee Member",
          description:
            "Area committee members serve on standing committees like Archives, Corrections, CPC/PI, Grapevine, Literature, and Treatment & Accessibilities.",
          timeCommitment: "Varies by committee",
        },
        areaOfficer: {
          title: "Area Officer",
          description:
            "Area officers include the Delegate, Alternate Delegate, Chair, Alternate Chair, Secretary, and Treasurer. They serve for a two-year rotating panel.",
          timeCommitment: "2-year term, significant commitment",
        },
      },
      linkLabel: "View all Area 36 positions and committees",
    },
    localResources: {
      title: "Area 36 Resources",
      description: "Download these guides and materials to help you get started in service.",
      linkLabel: "View all resources",
    },
    gsoResources: {
      title: "GSO Resources",
      description:
        "These resources from the General Service Office can help you learn more about service in A.A.",
      items: {
        serviceManual: {
          title: "The A.A. Service Manual",
          description: "The comprehensive guide to A.A. service",
        },
        twelveConcepts: {
          title: "Twelve Concepts for World Service",
          description: "Principles for A.A. service work",
        },
        guidelines: {
          title: "A.A. Guidelines",
          description: "Shared experience for various service areas",
        },
        box459: {
          title: "Box 459 Newsletter",
          description: "News from GSO",
        },
      },
    },
    cta: {
      title: "Ready to Get Started?",
      description:
        "The best way to start in service is to attend a district meeting or Area Assembly. Talk to your group's GSR or contact us to learn more.",
      eventsButtonLabel: "View Upcoming Events",
      contactButtonLabel: "Contact Us",
    },
  },
  temporaryContactPrograms: {
    header: {
      badge: "Bridging the Gap",
      title: "Temporary Contact Program",
      description: "Helping alcoholics make the transition from corrections or treatment facilities to the A.A. community.",
    },
    about: {
      title: "What is the Temporary Contact Program?",
      paragraph1:
        "Alcoholics Anonymous has a single purpose of helping individuals who identify as alcoholics to find sobriety through attendance at A.A. meetings and participation with the Fellowship of A.A.",
      paragraph2:
        "The Temporary Contact Program (TCP) is an opportunity for alcoholics in a corrections institution or a treatment program to attend Alcoholics Anonymous meetings soon after their discharge from the corrections or treatment facility. The TCP is designed to help alcoholics in a corrections institution or treatment facility make the transition to the Alcoholics Anonymous community.",
      paragraph3:
        "One of the more \"slippery\" places in the journey to sobriety is between the doors to the facility and the nearest A.A. group or meeting. The Temporary Contact Program is designed to bridge the gap between the facility and A.A. to help the newcomer with that transition.",
    },
    whyItMatters: {
      title: "Why It Matters",
      intro:
        "The transition from a structured environment to everyday life can be challenging. A temporary contact can:",
      items: [
        "Help you find your first meeting",
        "Introduce you to other A.A. members",
        "Answer questions about A.A.",
        "Provide support during the transition",
      ],
    },
    programs: {
      title: "Choose Your Program",
      description:
        "Whether you're coming from a corrections facility or treatment program, we have a temporary contact program to help you.",
      corrections: {
        title: "Corrections TCP",
        subtitle: "For individuals transitioning from correctional facilities",
        body:
          "If you are currently in or being released from a correctional facility and would like help connecting with A.A., or if you would like to volunteer as a temporary contact for those in corrections, this program is for you.",
        buttonLabel: "Corrections TCP",
      },
      treatment: {
        title: "Treatment TCP",
        subtitle: "For individuals transitioning from treatment programs",
        body:
          "If you are currently in or being discharged from a treatment program and would like help connecting with A.A., or if you would like to volunteer as a temporary contact for those in treatment, this program is for you.",
        buttonLabel: "Treatment TCP",
      },
    },
    volunteer: {
      title: "Volunteer as a Temporary Contact",
      description:
        "Service is a vital part of recovery. By becoming a temporary contact, you can help another alcoholic make the critical transition from a facility to the A.A. community. Your experience and support can make all the difference.",
      correctionsButtonLabel: "Corrections Volunteers",
      treatmentButtonLabel: "Treatment Volunteers",
    },
  },
  treatmentTcp: {
    header: {
      badge: "Treatment",
      title: "Treatment Temporary Contact Program",
      description:
        "Many A.A. members can tell you that, even though we were aware of Alcoholics Anonymous in treatment, we were too fearful to go alone. In order to bridge the gap between the treatment facility and A.A. community, A.A. members have volunteered to be temporary contacts for 30 to 90 days to introduce you to our Alcoholics Anonymous community.",
      secondaryDescription:
        "We cannot emphasize enough the importance of having a temporary contact as the essential link between treatment and recovering from alcoholism.",
      backLinkLabel: "Back to Temporary Contact Programs",
    },
    forms: {
      newcomer: {
        cardTitle: "Newcomer Sign Up",
        cardDescription: "Request a temporary contact",
        introParagraph1:
          "Temporary contacts will pick you up and take you to A.A. meetings, help you find a temporary sponsor, and guide you in your early days of working the A.A. recovery program. No matter how far down the road you have traveled, you can recover from the disease of Alcoholism.",
        introParagraph2:
          "If you are currently in a Treatment Center, please fill out this form to request a temporary contact. The Treatment Temporary Contact Program Coordinator will reach out to you shortly.",
        firstNameLabel: "First Name",
        lastNameLabel: "Last Name",
        phoneLabel: "Phone",
        ageLabel: "Age",
        genderLabel: "Gender",
        dischargeDateLabel: "Discharge Date",
        cityLabel: "City (after discharge)",
        zipCodeLabel: "Zip Code (after discharge)",
        treatmentFacilityLabel: "Treatment Facility",
        treatmentFacilityPhoneLabel: "Treatment Facility Phone",
        treatmentFacilityAddressLabel: "Treatment Facility Address",
        submitButtonLabel: "Submit Request",
        successTitle: "Request Submitted!",
        successBody:
          "Thank you for your request. The Treatment TCP Coordinator will contact you shortly.",
        successButtonLabel: "Submit Another Request",
      },
      volunteer: {
        cardTitle: "Volunteer Sign Up",
        cardDescription: "Become a temporary contact",
        introParagraph1:
          "Continuing to be of service is an integral aspect of working the A.A. recovery program. Working with newcomers also keeps the disease of alcoholism front and center, ever reminding us that we can never be cured of alcoholism and that our recovery depends upon our spiritual fitness on a daily basis.",
        introParagraph2:
          "If you are looking to volunteer to be a temporary contact, or you are a treatment center looking for more information, please fill out this form. The Treatment Temporary Contact Program Coordinator will reach out to you shortly.",
        firstNameLabel: "First Name",
        lastNameLabel: "Last Name",
        phoneLabel: "Phone",
        emailLabel: "Email",
        ageLabel: "Age",
        genderLabel: "Gender",
        cityLabel: "City",
        zipCodeLabel: "Zip Code",
        homeGroupLabel: "Home Group",
        homeGroupCityLabel: "Home Group City",
        sobrietyDateLabel: "Sobriety Date",
        submitButtonLabel: "Sign Up to Volunteer",
        successTitle: "Thank You for Volunteering!",
        successBody:
          "Your sign up has been received. The Treatment TCP Coordinator will contact you shortly.",
        successButtonLabel: "Submit Another",
      },
      common: {
        recaptchaNotice: "This form is protected by Google reCAPTCHA v3.",
        submittingLabel: "Submitting...",
        recaptchaNotLoadedError: "reCAPTCHA not loaded. Please refresh and try again.",
        genericError: "An error occurred",
        genericRetryError: "An error occurred. Please try again.",
      },
    },
    sections: {
      formsAriaLabel: "Sign Up Forms",
    },
    guidelines: {
      title: "Volunteer Guidelines",
      intro:
        "Your job is simple. You contact the new A.A. member and arrange to take them to an A.A. meeting, preferably within 24-48 hours of their discharge. Your commitment is taking them to as many as six meetings.",
      notePrefix: "Please note:",
      noteBody:
        "It is not intended that you become their sponsor, even temporarily. It is best if the word \"sponsor\" is not used to describe this type of service. The term \"Temporary Contact\" is preferred.",
      rulesBody:
        "Volunteers need to adhere to treatment facility rules regarding contact with residents, both while they are in the facility and after they are discharged. The Treatment Temporary Contact Program Coordinator can provide the necessary information for each facility.",
      items: [
        "Remember you may be the first outside member of A.A. the contact meets. As such, you are representing all of us. It is important to be relaxed, friendly and interested.",
        "Keep the general conversation related to recovery. Avoid discussing the new member's discharge. We have no opinion on outside issues.",
        "Take time to introduce the new person to as many A.A. members as possible. Do not, however, push your contact. Some people are very shy.",
        "Invite them to the \"meeting after the meeting\" if there is one. Show them we are happy, joyous and free and that sobriety can be enjoyable.",
        "Your commitment is usually finished after attending six meetings or as soon as a sponsor has been located. Use good recovery related judgment about when to end the relationship.",
        "Make sure the newly released A.A. member receives meeting schedules, phone numbers and A.A. literature.",
        "Encourage the new member to attend meetings as often as possible, to find a home group and to get a sponsor as soon as possible. Let them know even a temporary sponsor now would be acceptable.",
        "Share your experience, strength and hope with the newly discharged member, just as you would anyone else new to A.A. in your community.",
        "Be familiar with the suggestions of the Treatment Temporary Contact Program contained in the pamphlet. We don't offer or imply any other service and assistance unless we personally want to provide it.",
        "Please respect the complete anonymity of the new member.",
      ],
    },
    resources: {
      title: "Additional Resources",
      treatmentCommittees: {
        title: "Treatment Committees",
        description: "More information about the Treatment TCP on AA.org",
        url: "https://www.aa.org/treatment-committees",
      },
      newcomerPamphlet: {
        title: "Newcomer Pamphlet",
        description: "Information for those requesting a contact",
        url: "https://www.aa.org/aa-temporary-contactbridging-gap-request-inside",
      },
      volunteerPamphlet: {
        title: "Volunteer Pamphlet",
        description: "Information for volunteer temporary contacts",
        url: "https://www.aa.org/aa-temporary-contactbridging-gap-volunteer-outside",
      },
      opensNewTabLabel: "(opens in new tab)",
    },
    contact: {
      title: "Questions?",
      description:
        "For more information about the Treatment Temporary Contact Program, please contact the Treatment TCP Coordinator or the Treatment Committee.",
      coordinatorEmail: "ttcc@area36.org",
      committeeEmail: "treatment@area36.org",
    },
  },
  ypaa: {
    header: {
      badge: "Young People in A.A.",
      title: "YPAA",
      description:
        "Young People in Alcoholics Anonymous (YPAA) is for A.A. members of all ages who identify as young people or young at heart. If you think you're young, you're young!",
    },
    about: {
      title: "What is YPAA?",
      paragraph1:
        "YPAA committees exist to make Alcoholics Anonymous more accessible and welcoming to younger alcoholics. While there is no official age requirement, YPAA groups and events provide a space where young people can connect with others who share similar experiences.",
      paragraph2:
        "YPAA is not separate from A.A. - it is A.A. for young people. YPAA committees organize events, conferences, and activities that help carry the message to young alcoholics who might otherwise feel out of place.",
      paragraph3:
        "Whether you got sober at 18 or 45, if you feel young in sobriety, YPAA is for you!",
    },
    whyItMatters: {
      title: "Why YPAA Matters",
      paragraph1:
        "Alcoholism does not discriminate by age. Many young people struggle with alcohol before they ever have a legal drink.",
      paragraph2:
        "YPAA helps young people find others who understand their unique challenges - from not yet having a career to still living with parents to navigating sober dating.",
    },
    organizations: {
      title: "YPAA Organizations",
      mnypaa: {
        title: "MNYPAA",
        subtitle: "Minnesota Young People in A.A.",
        body:
          "MNYPAA is the statewide YPAA committee for Minnesota, organizing events, conferences, and service opportunities for young people across the state.",
        item1: "Annual Minnesota Young People's Conference",
        item2: "Events throughout Minnesota",
        buttonLabel: "Visit MNYPAA.org",
      },
      icypaa: {
        title: "ICYPAA",
        subtitle: "International Conference of Young People in A.A.",
        body:
          "ICYPAA is the largest annual gathering of young people in A.A., bringing together thousands of young alcoholics from around the world for a weekend of recovery, fellowship, and fun.",
        item1: "Annual international conference",
        item2: "Rotating host cities worldwide",
        buttonLabel: "Visit ICYPAA.org",
      },
    },
    meetings: {
      title: "Find YPAA Meetings",
      body:
        "Many areas have meetings specifically for young people, or meetings that attract a younger crowd. Check the A.A. meeting finder or contact your local intergroup to find YPAA-friendly meetings in your area.",
      minneapolisButtonLabel: "Minneapolis Area",
      contactButtonLabel: "Contact Area 36",
    },
    getInvolved: {
      title: "Get Involved",
      description:
        "Whether you want to attend a YPAA event, start a young people's meeting, or get involved in YPAA service, there are many ways to connect with young people in A.A.",
      connectButtonLabel: "Connect with MNYPAA",
      eventsButtonLabel: "View Area 36 Events",
    },
  },
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
          { path: "footer.areaLinks.professionals.label", label: "Area link: For Professionals (label)", type: "text" },
          { path: "footer.areaLinks.professionals.href", label: "Area link: For Professionals (URL)", type: "text" },
          { path: "footer.areaLinks.gsc.label", label: "Area link: General Service Conference (label)", type: "text" },
          { path: "footer.areaLinks.gsc.href", label: "Area link: General Service Conference (URL)", type: "text" },
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
          { path: "page.labels.contributions", label: "Label: Contributions", type: "text" },
          { path: "page.labels.citiesPrefix", label: "Label: Cities prefix", type: "text" },
          { path: "page.labels.actions", label: "Label: Actions", type: "text" },
          { path: "page.labels.positionOpen", label: "Text: Position currently open", type: "text" },
          { path: "page.labels.at", label: "Label: at (meeting time)", type: "text" },
          { path: "page.labels.countiesMore", label: 'Counties summary suffix (use "{count}")', type: "text" },
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
              "Array of districts. Optional fields include contributionAddress. Edit carefully: meetingDay supports patterns like \"3rd Wednesday\" (used to derive monthly meeting occurrences).",
            type: "json",
            translatable: false,
          },
        ],
      },
    ],
  },
  about: {
    scope: "about",
    title: "About",
    description: "About page content.",
    defaultsEn: pagesDefaultsEn.about as ContentDoc,
    sections: buildSectionsFromTopLevel("about", pagesDefaultsEn.about as ContentDoc, {
      header: "Header",
      mission: "Mission",
      values: "Values",
      structure: "Area Structure",
      accessibility: "Accessibility",
      professionals: "For Professionals",
    }),
  },
  committees: {
    scope: "committees",
    title: "Committees",
    description: "Committees and officers page content.",
    defaultsEn: pagesDefaultsEn.committees as ContentDoc,
    sections: buildSectionsFromTopLevel("committees", pagesDefaultsEn.committees as ContentDoc, {
      header: "Header",
      officersSection: "Officers Section",
      officers: "Officers",
      committeesSection: "Committees Section",
      committeeUi: "Committee UI Labels",
      committeesData: "Committees",
      getInvolved: "Get Involved",
    }),
  },
  contact: {
    scope: "contact",
    title: "Contact",
    description: "Contact page header content.",
    defaultsEn: pagesDefaultsEn.contact as ContentDoc,
    sections: buildSectionsFromTopLevel("contact", pagesDefaultsEn.contact as ContentDoc, {
      header: "Header",
    }),
  },
  contribute: {
    scope: "contribute",
    title: "Contribute",
    description: "Contribute page header content.",
    defaultsEn: pagesDefaultsEn.contribute as ContentDoc,
    sections: buildSectionsFromTopLevel("contribute", pagesDefaultsEn.contribute as ContentDoc, {
      header: "Header",
    }),
  },
  correctionsTcp: {
    scope: "correctionsTcp",
    title: "Corrections TCP",
    description: "Corrections Temporary Contact Program page header content.",
    defaultsEn: pagesDefaultsEn.correctionsTcp as ContentDoc,
    sections: buildSectionsFromTopLevel("correctionsTcp", pagesDefaultsEn.correctionsTcp as ContentDoc, {
      header: "Header",
    }),
  },
  events: {
    scope: "events",
    title: "Events",
    description: "Events page hero content.",
    defaultsEn: pagesDefaultsEn.events as ContentDoc,
    sections: buildSectionsFromTopLevel("events", pagesDefaultsEn.events as ContentDoc, {
      hero: "Hero",
    }),
  },
  generalServiceConference: {
    scope: "generalServiceConference",
    title: "General Service Conference",
    description: "General Service Conference page header content.",
    defaultsEn: pagesDefaultsEn.generalServiceConference as ContentDoc,
    sections: buildSectionsFromTopLevel("generalServiceConference", pagesDefaultsEn.generalServiceConference as ContentDoc, {
      header: "Header",
    }),
  },
  grapevine: {
    scope: "grapevine",
    title: "Grapevine",
    description: "Grapevine page header content.",
    defaultsEn: pagesDefaultsEn.grapevine as ContentDoc,
    sections: buildSectionsFromTopLevel("grapevine", pagesDefaultsEn.grapevine as ContentDoc, {
      header: "Header",
    }),
  },
  newsletter: {
    scope: "newsletter",
    title: "Newsletter",
    description: "Newsletter page header content.",
    defaultsEn: pagesDefaultsEn.newsletter as ContentDoc,
    sections: buildSectionsFromTopLevel("newsletter", pagesDefaultsEn.newsletter as ContentDoc, {
      header: "Header",
    }),
  },
  professionals: {
    scope: "professionals",
    title: "Professionals",
    description: "Professionals page header content.",
    defaultsEn: pagesDefaultsEn.professionals as ContentDoc,
    sections: buildSectionsFromTopLevel("professionals", pagesDefaultsEn.professionals as ContentDoc, {
      header: "Header",
    }),
  },
  recordings: {
    scope: "recordings",
    title: "Recordings",
    description: "Recordings page header content.",
    defaultsEn: pagesDefaultsEn.recordings as ContentDoc,
    sections: buildSectionsFromTopLevel("recordings", pagesDefaultsEn.recordings as ContentDoc, {
      header: "Header",
    }),
  },
  reports: {
    scope: "reports",
    title: "Reports",
    description: "Reports page header content.",
    defaultsEn: pagesDefaultsEn.reports as ContentDoc,
    sections: buildSectionsFromTopLevel("reports", pagesDefaultsEn.reports as ContentDoc, {
      header: "Header",
    }),
  },
  resources: {
    scope: "resources",
    title: "Resources",
    description: "Resources page header content.",
    defaultsEn: pagesDefaultsEn.resources as ContentDoc,
    sections: buildSectionsFromTopLevel("resources", pagesDefaultsEn.resources as ContentDoc, {
      header: "Header",
    }),
  },
  serviceBasics: {
    scope: "serviceBasics",
    title: "Service Basics",
    description: "Service Basics page header content.",
    defaultsEn: pagesDefaultsEn.serviceBasics as ContentDoc,
    sections: buildSectionsFromTopLevel("serviceBasics", pagesDefaultsEn.serviceBasics as ContentDoc, {
      header: "Header",
    }),
  },
  temporaryContactPrograms: {
    scope: "temporaryContactPrograms",
    title: "Temporary Contact Programs",
    description: "Temporary Contact Programs page header content.",
    defaultsEn: pagesDefaultsEn.temporaryContactPrograms as ContentDoc,
    sections: buildSectionsFromTopLevel("temporaryContactPrograms", pagesDefaultsEn.temporaryContactPrograms as ContentDoc, {
      header: "Header",
    }),
  },
  treatmentTcp: {
    scope: "treatmentTcp",
    title: "Treatment TCP",
    description: "Treatment Temporary Contact Program page content.",
    defaultsEn: pagesDefaultsEn.treatmentTcp as ContentDoc,
    sections: buildSectionsFromTopLevel("treatmentTcp", pagesDefaultsEn.treatmentTcp as ContentDoc, {
      header: "Header",
      forms: "Forms",
      sections: "Section Labels",
      guidelines: "Volunteer Guidelines",
      resources: "Resources",
      contact: "Contact",
    }),
  },
  ypaa: {
    scope: "ypaa",
    title: "YPAA",
    description: "YPAA page header content.",
    defaultsEn: pagesDefaultsEn.ypaa as ContentDoc,
    sections: buildSectionsFromTopLevel("ypaa", pagesDefaultsEn.ypaa as ContentDoc, {
      header: "Header",
    }),
  },
}
