import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail, Users, Info, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { fetchCommitteeFiles } from "./actions"
import { CommitteesContent } from "./committees-content"

const officers = [
  {
    role: "Delegate",
    name: "Doug H.",
    email: "delegate@area36.org",
    description:
      "The GSC delegate is elected every odd-numbered year to represent the area at the annual meeting of the conference in New York, and to bring back to the area the results of the Conference meeting.",
  },
  {
    role: "Alternate Delegate",
    name: "Jennifer A.",
    email: "altdelegate@area36.org",
    description:
      "The alternate delegate serves as a valuable assistant, often traveling with the delegate or giving reports. In Area 36, the alternate delegate also serves as the Structure Committee Chair.",
  },
  {
    role: "Chairperson",
    name: "Matt B.",
    email: "chairperson@area36.org",
    description:
      "The Area Chair presides at Area Assembly and Area Committee meetings, sets the agenda, appoints committee chairpersons, and prepares the annual budget.",
  },
  {
    role: "Alternate Chairperson",
    name: "Eric M.",
    email: "altchairperson@area36.org",
    description:
      "The Alternate Area Chair works closely with the Area Chair and presides over meetings when the Chair is unable to attend. Also serves as the Finance Committee Chair.",
  },
  {
    role: "Secretary",
    name: "Jennifer G.",
    email: "secretary@area36.org",
    description:
      "The Secretary records the minutes of Area Assemblies, Area Committee Meetings, and Area Officer meetings, and develops agenda material for Area Assemblies.",
    interim: true,
  },
  {
    role: "Treasurer",
    name: "Nora H.",
    email: "treasurer@area36.org",
    description:
      "The Treasurer handles all area monies, keeping records of contributions and disbursements according to the Area Financial Guidelines.",
  },
]

export interface CommitteeData {
  name: string
  slug: string
  chairName: string | null
  email: string
  description: string | React.ReactNode
  archivistName?: string
  archivistEmail?: string
  webmasterName?: string
  webmasterEmail?: string
  additionalContacts?: { role: string; name: string; email: string }[]
  // Extended content
  filesLabel?: string
  formsLabel?: string
  infoCards?: {
    title: string
    content: string
    email?: string
    address?: string
    link?: { url: string; label: string; isProtected?: boolean }
  }[]
  relatedPageUrl?: string
  relatedPageText?: string
}

const committees: CommitteeData[] = [
  {
    name: "Accessibilities",
    slug: "accessibilities",
    chairName: "Dan H.",
    email: "accessibilities@area36.org",
    description: (
      <>
        <p className="mb-3">
          Greetings, and welcome to the Accessibilities Committee page. Quite often the first question is &quot;What exactly constitutes a remote community?&quot; and &quot;What does the Accessibilities committee actually do?&quot;.
        </p>
        <p className="mb-3">
          The definition of Accessibilities community is where it is difficult to carry the AA message because of language, culture, geography, or life condition. As you can see that applies equally as well to communities in the most rural parts of the Area as it does to communities in the heart of Minneapolis who, for a range of reasons, are not getting AA&apos;s message. Thus, the central mission of this committee is to go to any lengths necessary to carry AA&apos;s message to all those who need it and is just one more link in the chain or responsibility in our effort to help the alcoholic to who still suffers.
        </p>
        <p>
          At first glance it may seem that this committee reproduces some of the work of the PI or CPC committees. In reality, while the RC does work closely with these two committees, the RC serves a different need and helps fill the gap in our Area&apos;s overall 12-step work by reaching out to various communities that might not fall under the responsibility of the other area committees.
        </p>
      </>
    ),
    filesLabel: "Resources",
  },
  {
    name: "Archives",
    slug: "archives",
    chairName: null,
    email: "archives@area36.org",
    archivistName: "Vince F.",
    archivistEmail: "archivist@area36.org",
    description:
      "The Archives Committee gathers current and historical information about A.A., especially in our Area and preserves it in a meaningful order. This committee provides a clearinghouse of information in the Area with respect to Archives, coordinating the exchange of ideas and resources between districts. Provides experience and assistance in developing projects that will further the carrying of our A.A. message with respect to Archives.",
    formsLabel: "History Forms",
  },
  {
    name: "Cooperation with the Professional Community (CPC)",
    slug: "cpc",
    chairName: "Jim M.",
    email: "cpc@area36.org",
    description:
      "Works with A.A. groups to provide information on Alcoholics Anonymous to professionals who often meet alcoholics before we do.",
  },
  {
    name: "Corrections",
    slug: "corrections",
    chairName: "Dave A.",
    email: "corrections@area36.org",
    additionalContacts: [
      { role: "Temporary Contact Coordinator", name: "Brian M.", email: "ctcp@area36.org" },
      { role: "Pink Can Coordinator", name: "Patrick W.", email: "pinkcanplan@area36.org" },
    ],
    description:
      "Coordinates the work of A.A. groups in carrying the A.A. message to alcoholics in correctional facilities. Manages the Temporary Contact Program and the Pink Can Plan for literature distribution.",
    formsLabel: "Pink Can Plan Forms",
    filesLabel: "Resources",
    infoCards: [
      {
        title: "Submit Pink Can Plan Orders",
        content: "Mail completed forms to the address below or email them to the Pink Can Coordinator.",
        email: "pinkcanplan@area36.org",
        address: "Pink Can Plan\nPO Box 41633\nPlymouth, MN 55441-0633",
      },
      {
        title: "Corrections Database",
        content: "This database contains information about the correctional facilities in Minnesota. Only those with an Area36.org email account can access this database. The database is also password protected. Contact the Corrections Chair about the password.",
        link: {
          url: "https://drive.google.com/file/d/1c6XjH6ODGmRAbFKEEL0APvMza3P9oZYE/view?usp=sharing",
          label: "Access Database",
          isProtected: true,
        },
      },
    ],
  },
  {
    name: "Finance",
    slug: "finance",
    chairName: "Eric M.",
    email: "finance@area36.org",
    description:
      "Monitors the Area's financial needs, policies and practices. Responsible for reminding groups of their Seventh Tradition opportunities. Reviews and updates the Area financial guidelines as needed.",
  },
  {
    name: "Grapevine",
    slug: "grapevine",
    chairName: "Tom W.",
    email: "grapevine@area36.org",
    description:
      "Coordinates the work of A.A. members, groups, and districts to read, subscribe to and utilize the Grapevine and Grapevine-produced materials. Encourages members to contribute written material for publication.",
  },
  {
    name: "Literature",
    slug: "literature",
    chairName: "Andy J.",
    email: "literature@area36.org",
    description:
      "Provides information to A.A. members and groups encouraging the use of Conference approved literature and maintains inventory of the Area literature.",
  },
  {
    name: "Newsletter",
    slug: "newsletter",
    chairName: "Joe S.",
    email: "newsletter@area36.org",
    description:
      "Publishes The Pigeon four times a year, an informative newsletter about service activities and opportunities throughout the Area.",
  },
  {
    name: "Public Information (PI)",
    slug: "pi",
    chairName: null,
    email: "pi@area36.org",
    description:
      "Increases awareness of A.A. in the general public. Also monitors anonymity breaks at the level of press, radio and film.",
  },
  {
    name: "Registrar",
    slug: "registrar",
    chairName: "Justin P.",
    email: "registrar@area36.org",
    description:
      "Maintains an accurate database and mailing list of the groups and trusted servants in the Area. This database is used for mailing lists, the Area Directory, and group listings.",
  },
  {
    name: "Structure",
    slug: "structure",
    chairName: "Jennifer A.",
    email: "structure@area36.org",
    description:
      "Reviews how the area functions internally on a continual basis. The Alternate Delegate serves as the Structure Committee Chair.",
  },
  {
    name: "Technology",
    slug: "technology",
    chairName: "Becky N.",
    email: "technology@area36.org",
    webmasterName: "Josh G.",
    webmasterEmail: "webmaster@area36.org",
    description:
      "Develops and maintains the Area website, ensuring information is kept current. Addresses technical issues including errors, broken links, and missing documents.",
  },
  {
    name: "Treatment",
    slug: "treatment",
    chairName: "Brad S.",
    email: "treatment@area36.org",
    additionalContacts: [
      { role: "Temporary Contact Coordinator", name: "Patrick S.", email: "ttcc@area36.org" },
    ],
    description: (
      <>
        <p className="mb-3">
          The Treatment Facilities Committee leads and coordinates the work of AA members and groups in carrying the A.A. message to alcoholics in treatment facilities.
        </p>
        <p className="mb-3 font-semibold">A.A. TEMPORARY CONTACT VOLUNTEERS</p>
        <p className="mb-3">
          A TEMPORARY CONTACT is a member of Alcoholics Anonymous who works with alcoholics both in and coming out of treatment facilities/programs.
        </p>
        <p className="mb-3 font-semibold">
          THE PRIMARY PURPOSE IS TO HELP THEM BRIDGE THE GAP TO ALCOHOLICS ANONYMOUS.
        </p>
        <p className="mb-3">
          It is a short term arrangement (30 - 90 days) until the new member has become established in a group and has found permanent sponsorship.
        </p>
        <p className="mb-3">
          The TEMPORARY CONTACT may do such things as visit the alcoholic before they leave the facility, provide them with AA conference approved literature and a local meeting list, let them know about the AA Grapevine magazine, how to subscribe and possibly give them a couple of old Grapevine issues, visit with them for one on one sharing, take them to a variety of meetings before and after they leave (especially their first day back in the community), meet them at meetings, introduce them to as many AA&apos;s as possible, help them into the after meeting coffee groups, call them, ensure they have the phone numbers of several AA&apos;s, talk with them about sponsorship and guide them to selecting a more permanent sponsor and a home group.
        </p>
        <p className="mb-3">
          The TEMPORARY CONTACT must ensure that their information on the contact list is current and accurate.
        </p>
        <p className="mb-3">
          TEMPORARY CONTACTS will be called upon to help a prospect/patient by matching their ZIP codes, gender and age group whenever possible.
        </p>
        <p>
          The volunteer lists may be made available to Intergroups, District and Area committees. A call may come from any of these sources in addition to directly from a prospective member.
        </p>
      </>
    ),
    relatedPageUrl: "/treatment-temporary-contact-program",
    relatedPageText: "Fill out volunteer or newcomer forms",
  },
]

export default async function CommitteesPage() {
  // Fetch committee files from Google Drive
  const committeeFiles = await fetchCommitteeFiles()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="committees-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 id="committees-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              Committees & Officers
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Area 36 is served by elected officers and standing committees, all working together to carry the message
              of Alcoholics Anonymous throughout southern Minnesota.
            </p>
          </div>
        </section>

        {/* Area Officers */}
        <section className="py-12 sm:py-16" aria-labelledby="officers-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 id="officers-heading" className="text-2xl font-bold text-foreground">
                Area Officers
              </h2>
              <p className="mt-2 text-muted-foreground">
                Elected officers serve two-year terms and are responsible for the overall operations of the Area.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {officers.map((officer) => (
                <Card key={officer.role} className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {officer.role}
                      {officer.interim && <span className="text-sm font-normal text-muted-foreground ml-2">(Interim)</span>}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{officer.name}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{officer.description}</p>
                    <Link
                      href={`mailto:${officer.email}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {officer.email}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Standing Committees */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="standing-committees-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 id="standing-committees-heading" className="text-2xl font-bold text-foreground">
                Standing Committees
              </h2>
              <p className="mt-2 text-muted-foreground">
                Standing committees focus on specific areas of service and are open to all interested A.A. members.
              </p>
            </div>

            <CommitteesContent committees={committees} committeeFiles={committeeFiles} />
          </div>
        </section>

        {/* Get Involved CTA */}
        <section className="py-12 sm:py-16" aria-labelledby="involved-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Info className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="involved-heading" className="text-xl font-bold text-foreground">
                    Get Involved in Service
                  </h2>
                  <p className="mt-2 text-muted-foreground max-w-2xl">
                    All committee meetings are open to any interested A.A. member. Service is a vital part of recovery
                    and a great way to give back to the fellowship that helped you.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Link
                      href="/service"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      Learn about service basics →
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      Contact us to get started →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
