import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  ExternalLink,
  FolderOpen,
  Briefcase,
  Hand,
  Accessibility,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchResources } from "./actions"
import { ResourcesContent } from "./resources-content"

// Loading skeleton
function ResourcesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-32 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

async function ResourcesContentWrapper() {
  const resources = await fetchResources()
  return <ResourcesContent resources={resources} />
}

export default function ResourcesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="resources-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 id="resources-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              Resources
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Access forms, documents, delegate reports, and other materials to support your service work in Area 36.
            </p>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-8 border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                  Find a Meeting
                  <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/newsletter">Latest Newsletter</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/service">Service Basics</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/recordings">Recordings</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="#asl">ASL Resources</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Documents Tabs */}
        <section className="py-12 sm:py-16" aria-label="Documents and forms">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<ResourcesSkeleton />}>
              <ResourcesContentWrapper />
            </Suspense>
          </div>
        </section>

        {/* Special Sections */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-label="Additional resources">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* For Professionals */}
              <Card id="professionals">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Briefcase className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>For Professionals</CardTitle>
                  <CardDescription>
                    Resources for healthcare providers, educators, clergy, and other professionals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/aa-for-professionals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. for Professionals (AA.org)
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/aa-resource-health-care-professional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. as a Resource for Healthcare
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link href="/professionals" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Area 36 Resources for Professionals →
                  </Link>
                </CardContent>
              </Card>

              {/* Temporary Contact / Bridging the Gap */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Hand className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Temporary Contact Programs</CardTitle>
                  <CardDescription>
                    Bridging the Gap and pre-release contact information for those leaving treatment or corrections.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Help newcomers make their first meeting by becoming a temporary contact or requesting a contact for
                    someone you know.
                  </p>
                  <Link href="/temporary-contact-programs" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Learn About TCP →
                  </Link>
                  <Link href="/treatment-temporary-contact-program" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Treatment TCP →
                  </Link>
                  <Link href="/corrections-temporary-contact-program" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Corrections TCP →
                  </Link>
                </CardContent>
              </Card>

              {/* ASL Resources */}
              <Card id="asl">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Accessibility className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>ASL Resources</CardTitle>
                  <CardDescription>Resources for deaf and hard of hearing members.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/accessibility-resources"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. Accessibility Resources
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    To request ASL interpretation for an Area 36 event, please contact the Accessibility Committee.
                  </p>
                  <Link href="/committees" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    Contact Accessibility Committee →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* External Links */}
        <section className="py-12 sm:py-16" aria-labelledby="external-links-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="external-links-heading" className="text-2xl font-bold text-foreground mb-6">
              A.A. Resources
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "AA.org", url: "https://www.aa.org", description: "Official A.A. website" },
                { name: "AA Grapevine", url: "https://www.aagrapevine.org", description: "Meeting in print" },
                { name: "La Viña", url: "https://www.aalavina.org", description: "Spanish-language Grapevine" },
                { name: "Find a Meeting", url: "https://www.aa.org/find-aa", description: "Meeting finder" },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {link.name}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </div>
                  <span className="text-sm text-muted-foreground mt-1">{link.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
