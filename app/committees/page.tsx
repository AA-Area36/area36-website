import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail, Users, Info } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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

const committees = [
  {
    name: "Accessibilities",
    chairName: "Dan H.",
    email: "accessibilities@area36.org",
    description:
      "Reaches out to communities where it's difficult to carry AA's message due to language, culture, geography, or life conditions. Works with PI and CPC committees to help alcoholics who still suffer.",
  },
  {
    name: "Archives",
    chairName: null,
    email: "archives@area36.org",
    archivistName: "Vince F.",
    archivistEmail: "archivist@area36.org",
    description:
      "Gathers current and historical information about A.A., especially in our Area, and preserves it in a meaningful order. Provides a clearinghouse of information and coordinates the exchange of ideas between districts.",
  },
  {
    name: "Cooperation with the Professional Community (CPC)",
    chairName: "Jim M.",
    email: "cpc@area36.org",
    description:
      "Works with A.A. groups to provide information on Alcoholics Anonymous to professionals who often meet alcoholics before we do.",
  },
  {
    name: "Corrections",
    chairName: "Dave A.",
    email: "corrections@area36.org",
    additionalContacts: [
      { role: "Temporary Contact Coordinator", name: "Brian M.", email: "ctcp@area36.org" },
      { role: "Pink Can Coordinator", name: "Patrick W.", email: "pinkcanplan@area36.org" },
      { role: "Statewide Corrections Chair", name: "Carter L.", email: "correctionsmn@area36.org" },
    ],
    description:
      "Coordinates the work of A.A. groups in carrying the A.A. message to alcoholics in correctional facilities. Manages the Temporary Contact Program and the Pink Can Plan for literature distribution.",
  },
  {
    name: "Finance",
    chairName: "Eric M.",
    email: "finance@area36.org",
    description:
      "Monitors the Area's financial needs, policies and practices. Responsible for reminding groups of their Seventh Tradition opportunities. Reviews and updates the Area financial guidelines as needed.",
  },
  {
    name: "Grapevine",
    chairName: "Tom W.",
    email: "grapevine@area36.org",
    description:
      "Coordinates the work of A.A. members, groups, and districts to read, subscribe to and utilize the Grapevine and Grapevine-produced materials. Encourages members to contribute written material for publication.",
  },
  {
    name: "Literature",
    chairName: "Andy J.",
    email: "literature@area36.org",
    description:
      "Provides information to A.A. members and groups encouraging the use of Conference approved literature and maintains inventory of the Area literature.",
  },
  {
    name: "Newsletter",
    chairName: "Joe S.",
    email: "newsletter@area36.org",
    description:
      "Publishes The Pigeon four times a year, an informative newsletter about service activities and opportunities throughout the Area.",
  },
  {
    name: "Public Information (PI)",
    chairName: null,
    email: "pi@area36.org",
    description:
      "Increases awareness of A.A. in the general public. Also monitors anonymity breaks at the level of press, radio and film.",
  },
  {
    name: "Registrar",
    chairName: "Justin P.",
    email: "registrar@area36.org",
    description:
      "Maintains an accurate database and mailing list of the groups and trusted servants in the Area. This database is used for mailing lists, the Area Directory, and group listings.",
  },
  {
    name: "Structure",
    chairName: "Jennifer A.",
    email: "structure@area36.org",
    description:
      "Reviews how the area functions internally on a continual basis. The Alternate Delegate serves as the Structure Committee Chair.",
  },
  {
    name: "Technology",
    chairName: "Becky N.",
    email: "technology@area36.org",
    webmasterName: "Josh G.",
    webmasterEmail: "webmaster@area36.org",
    description:
      "Develops and maintains the Area website, ensuring information is kept current. Addresses technical issues including errors, broken links, and missing documents.",
  },
  {
    name: "Treatment",
    chairName: "Brad S.",
    email: "treatment@area36.org",
    additionalContacts: [
      { role: "Temporary Contact Coordinator", name: "Patrick S.", email: "ttcc@area36.org" },
    ],
    description:
      "Leads and coordinates the work of A.A. members and groups in carrying the A.A. message to alcoholics in treatment facilities. Manages the Bridging the Gap program through Temporary Contacts.",
  },
]

export default function CommitteesPage() {
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

            <Accordion type="single" collapsible className="space-y-4">
              {committees.map((committee) => (
                <AccordionItem
                  key={committee.name}
                  value={committee.name}
                  className="rounded-xl border border-border bg-card px-6"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <Users className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                      <div>
                        <span className="font-semibold text-foreground">{committee.name}</span>
                        {committee.chairName && (
                          <span className="ml-2 text-sm text-muted-foreground">Chair: {committee.chairName}</span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="pl-8">
                      <p className="text-muted-foreground mb-4">{committee.description}</p>
                      <div className="space-y-2">
                        <Link
                          href={`mailto:${committee.email}`}
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          {committee.chairName ? `Chair (${committee.chairName})` : "Contact Committee"}: {committee.email}
                        </Link>
                        {committee.archivistName && (
                          <div>
                            <Link
                              href={`mailto:${committee.archivistEmail}`}
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" aria-hidden="true" />
                              Area Archivist ({committee.archivistName}): {committee.archivistEmail}
                            </Link>
                          </div>
                        )}
                        {committee.webmasterName && (
                          <div>
                            <Link
                              href={`mailto:${committee.webmasterEmail}`}
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" aria-hidden="true" />
                              Webmaster ({committee.webmasterName}): {committee.webmasterEmail}
                            </Link>
                          </div>
                        )}
                        {committee.additionalContacts?.map((contact) => (
                          <div key={contact.email}>
                            <Link
                              href={`mailto:${contact.email}`}
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" aria-hidden="true" />
                              {contact.role} ({contact.name}): {contact.email}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
