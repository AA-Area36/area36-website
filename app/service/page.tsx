import type React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BookOpen, Users, MessageSquare, ArrowRight, ExternalLink, Download } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const servicePositions = [
  {
    title: "General Service Representative (GSR)",
    description:
      "The GSR is elected by the group to represent its voice in A.A. as a whole. They attend district and area meetings, report back to the group, and help with group inventory.",
    timeCommitment: "Often 1-2 year term, monthly meetings",
  },
  {
    title: "District Committee Member (DCM)",
    description:
      "The DCM coordinates service activities in a district, supports GSRs, and serves as a link between groups and the area committee.",
    timeCommitment: "2-year term, monthly meetings + assemblies",
  },
  {
    title: "Area Committee Member",
    description:
      "Area committee members serve on standing committees like Archives, Corrections, CPC/PI, Grapevine, Literature, and Treatment & Accessibilities.",
    timeCommitment: "Varies by committee",
  },
  {
    title: "Area Officer",
    description:
      "Area officers include the Delegate, Alternate Delegate, Chair, Alternate Chair, Secretary, and Treasurer. They serve for a two-year rotating panel.",
    timeCommitment: "2-year term, significant commitment",
  },
]

const resources = [
  {
    title: "The A.A. Service Manual",
    href: "https://www.aa.org/aa-service-manualtwelve-concepts-world-services",
    external: true,
    description: "The comprehensive guide to A.A. service",
  },
  {
    title: "Twelve Concepts for World Service",
    href: "https://www.aa.org/the-twelve-concepts",
    external: true,
    description: "Principles for A.A. service work",
  },
  {
    title: "A.A. Guidelines",
    href: "https://www.aa.org/resources/literature?terms=guidelines",
    external: true,
    description: "Shared experience for various service areas",
  },
  {
    title: "Box 459 Newsletter",
    href: "https://www.aa.org/box-459",
    external: true,
    description: "News from GSO",
  },
]

const localResources = [
  { title: "GSR Kit - Getting Started", size: "1.2 MB" },
  { title: "DCM Handbook", size: "890 KB" },
  { title: "Area 36 Service Manual", size: "512 KB" },
]

export default function ServicePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="service-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 id="service-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                Service Basics
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                {
                  "We're glad you're here! General Service is how individual A.A. groups connect to A.A. as a whole. Learn how you can get involved and carry the message."
                }
              </p>
            </div>
          </div>
        </section>

        {/* Why Service */}
        <section className="py-12 sm:py-16" aria-labelledby="why-service-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 id="why-service-heading" className="text-3xl font-bold text-foreground">
                  Why General Service?
                </h2>
                <p className="mt-6 text-muted-foreground leading-relaxed">
                  {
                    "General Service is the activity of carrying A.A.'s message, as a whole fellowship, to the still-suffering alcoholic who hasn't yet found our program. It's the legacy of service that Bill W. and Dr. Bob left us."
                  }
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Through service, we ensure that A.A. will be here for future generations. Every member can
                  participate, from making coffee at a meeting to representing their group at the General Service
                  Conference.
                </p>
                <blockquote className="mt-8 border-l-4 border-primary pl-4 italic text-muted-foreground">
                  {
                    '"Our Twelfth Step—carrying the message—is the basic service that the A.A. Fellowship gives; this is our principal aim and the main reason for our existence."'
                  }
                  <cite className="mt-2 block text-sm not-italic">— A.A. Service Manual</cite>
                </blockquote>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <ServiceCard
                  icon={BookOpen}
                  title="Learn"
                  description="Study the service manual and attend workshops to understand how A.A. works."
                />
                <ServiceCard
                  icon={Users}
                  title="Participate"
                  description="Attend district and area meetings. Your voice matters in the group conscience."
                />
                <ServiceCard
                  icon={MessageSquare}
                  title="Share"
                  description="Bring information back to your home group and encourage others to participate."
                />
                <ServiceCard
                  icon={ArrowRight}
                  title="Grow"
                  description="Service positions at all levels help develop leadership and carry the message."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Service Positions */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="positions-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="positions-heading" className="text-3xl font-bold text-foreground text-center mb-4">
              Service Positions
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
              General Service has a structure that allows the conscience of the fellowship to guide A.A.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {servicePositions.map((position) => (
                <div key={position.title} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="text-lg font-semibold text-foreground">{position.title}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{position.description}</p>
                  <p className="mt-3 text-sm text-primary">{position.timeCommitment}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/committees"
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                View all Area 36 positions and committees
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16" aria-labelledby="local-resources-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h2 id="local-resources-heading" className="text-3xl font-bold text-foreground">
                  Area 36 Resources
                </h2>
                <p className="mt-4 text-muted-foreground">Download these guides to help you get started in service.</p>
                <ul className="mt-6 space-y-3" role="list">
                  {localResources.map((resource) => (
                    <li key={resource.title}>
                      <button className="group flex items-center justify-between w-full rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md text-left">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {resource.title}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{resource.size}</span>
                          <Download
                            className="h-4 w-4 text-muted-foreground group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/resources"
                    className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                  >
                    View all resources
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-foreground">GSO Resources</h2>
                <p className="mt-4 text-muted-foreground">
                  These resources from the General Service Office can help you learn more about service in A.A.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {resources.map((resource) => (
                    <li key={resource.title}>
                      <Link
                        href={resource.href}
                        target={resource.external ? "_blank" : undefined}
                        rel={resource.external ? "noopener noreferrer" : undefined}
                        className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                      >
                        <div>
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors block">
                            {resource.title}
                          </span>
                          <span className="text-sm text-muted-foreground">{resource.description}</span>
                        </div>
                        <ExternalLink
                          className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0"
                          aria-label="(opens in new tab)"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="max-w-2xl mx-auto opacity-90 mb-6">
              The best way to start in service is to attend a district meeting or Area Assembly. Talk to your group{"'"}
              s GSR or contact us to learn more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="/events">View Upcoming Events</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function ServiceCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
