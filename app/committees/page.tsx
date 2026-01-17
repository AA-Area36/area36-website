import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail, Users, Info } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const officers = [
  {
    role: "Delegate",
    name: "Panel 75",
    email: "delegate@area36.org",
    description:
      "The Delegate is the primary link between the local A.A. community and A.A. as a whole, serving as Area 36's representative to the General Service Conference.",
  },
  {
    role: "Alternate Delegate",
    name: "Panel 75",
    email: "altdelegate@area36.org",
    description:
      "The Alternate Delegate assists the Delegate and assumes their duties if necessary. They also coordinate report-backs and other delegate-related activities.",
  },
  {
    role: "Chairperson",
    name: "Current Chair",
    email: "chairperson@area36.org",
    description:
      "The Area Chairperson presides at all Area Assembly and Area Committee Meetings, coordinates the work of the Area Committee, and represents Area 36 at regional meetings.",
  },
  {
    role: "Alternate Chairperson",
    name: "Current Alt Chair",
    email: "altchairperson@area36.org",
    description:
      "The Alternate Chairperson assists the Chair in their duties and assumes the Chair's responsibilities in their absence.",
  },
  {
    role: "Secretary",
    name: "Current Secretary",
    email: "secretary@area36.org",
    description:
      "The Secretary keeps minutes of all Area Assembly and Area Committee Meetings and maintains Area records and correspondence.",
  },
  {
    role: "Treasurer",
    name: "Current Treasurer",
    email: "treasurer@area36.org",
    description:
      "The Treasurer manages all Area funds, provides financial reports, and maintains the Area's financial records according to A.A. guidelines.",
  },
]

const committees = [
  {
    name: "Accessibility",
    chair: "accessibility@area36.org",
    description:
      "Works to ensure that A.A. meetings and materials are accessible to all alcoholics, regardless of physical, mental, or language barriers. Coordinates ASL interpretation and accessibility resources.",
  },
  {
    name: "Archives",
    chair: "archives@area36.org",
    description:
      "Collects, preserves, and shares the history of Alcoholics Anonymous in Area 36. Maintains historical documents, photos, and memorabilia for future generations.",
  },
  {
    name: "Cooperation with the Professional Community (CPC)",
    chair: "cpc@area36.org",
    description:
      "Carries the message about A.A. to professionals who work with alcoholics, including doctors, clergy, lawyers, and social workers.",
  },
  {
    name: "Corrections",
    chair: "corrections@area36.org",
    description:
      "Coordinates A.A. service to alcoholics in correctional facilities and helps incarcerated members transition to A.A. upon release through pre-release contact programs.",
  },
  {
    name: "Grapevine / La Viña",
    chair: "grapevine@area36.org",
    description:
      "Promotes the Grapevine and La Viña magazines as valuable recovery resources and helps spread awareness of these publications throughout the Area.",
  },
  {
    name: "Literature",
    chair: "literature@area36.org",
    description:
      "Keeps the fellowship informed about A.A. literature, including new publications, revisions, and discontinued items. Assists groups in selecting appropriate literature.",
  },
  {
    name: "Public Information (PI)",
    chair: "pi@area36.org",
    description:
      "Carries the A.A. message to the general public through media, public service announcements, and community events, ensuring accurate information about A.A. is available.",
  },
  {
    name: "Treatment",
    chair: "treatment@area36.org",
    description:
      "Coordinates A.A. presentations and meetings at treatment facilities and helps residents make contact with A.A. members through Bridging the Gap programs.",
  },
  {
    name: "Website",
    chair: "webmaster@area36.org",
    description:
      "Maintains the Area 36 website, ensuring information is current and accessible. Implements new features and ensures the site meets accessibility standards.",
  },
  {
    name: "Group Records",
    chair: "grouprecords@area36.org",
    description:
      "Maintains accurate records of all registered A.A. groups in Area 36 and coordinates with the General Service Office on group information updates.",
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
                    <CardTitle className="text-lg">{officer.role}</CardTitle>
                    <CardDescription>{officer.name}</CardDescription>
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
                      <span className="font-semibold text-foreground">{committee.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="pl-8">
                      <p className="text-muted-foreground mb-4">{committee.description}</p>
                      <Link
                        href={`mailto:${committee.chair}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Contact: {committee.chair}
                      </Link>
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
