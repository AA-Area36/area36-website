import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FileText } from "lucide-react"
import { fetchNewsletters } from "./actions"
import { NewsletterViewer } from "./newsletter-viewer"

// Loading skeleton for the viewer
function ViewerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
        <div className="h-10 w-[140px] bg-muted rounded animate-pulse" />
      </div>
      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// Empty state when no newsletters are available
function EmptyState() {
  return (
    <div className="text-center py-16">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No Newsletters Available
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Newsletter archives are being prepared. Please check back soon or contact
        the Newsletter Chair for more information.
      </p>
    </div>
  )
}

async function NewsletterContent() {
  const { newsletters, years } = await fetchNewsletters()

  if (newsletters.length === 0) {
    return <EmptyState />
  }

  return <NewsletterViewer newsletters={newsletters} years={years} />
}

export default function NewsletterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-12 sm:py-16"
          aria-labelledby="newsletter-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="max-w-2xl">
                <h1
                  id="newsletter-heading"
                  className="text-4xl font-bold text-foreground sm:text-5xl"
                >
                  The Pigeon
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  The Pigeon is a General Service paper newsletter published four
                  times a year by the Southern Minnesota Area Assembly of Alcoholics
                  Anonymous. An anonymized digital version is available on this
                  website.
                </p>
                <p className="mt-4 text-sm text-muted-foreground italic">
                  The Pigeon presents the experience and opinions of A.A. members
                  and others interested in the A.A. program. Opinions expressed
                  herein are not to be attributed to Alcoholics Anonymous as a
                  whole, nor does publication of any article imply endorsement by
                  either A.A. or the Southern MN Area Assembly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Viewer */}
        <section className="py-8 sm:py-12" aria-label="Newsletter viewer">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<ViewerSkeleton />}>
              <NewsletterContent />
            </Suspense>
          </div>
        </section>

        {/* Subscribe & Submit Section */}
        <section
          className="py-12 sm:py-16 bg-muted/30"
          aria-labelledby="subscribe-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Subscribe */}
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2
                  id="subscribe-heading"
                  className="text-xl font-bold text-foreground mb-4"
                >
                  Subscribe to The Pigeon
                </h2>
                <p className="text-muted-foreground mb-4">
                  There is no subscription fee; contributions from A.A. members,
                  groups, and districts are welcome. Subscriptions are available,
                  for free, in both snail mail and email format. The email version
                  is anonymized.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  To subscribe to either format, please email both addresses below:
                </p>
                <div className="space-y-2">
                  <a
                    href="mailto:grouprecords@area36.org"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    grouprecords@area36.org
                  </a>
                  <a
                    href="mailto:newsletter@area36.org"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    newsletter@area36.org
                  </a>
                </div>
              </div>

              {/* Submit */}
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Submit an Article
                </h2>
                <p className="text-muted-foreground mb-4">
                  Articles and letters are invited, although no payment can be
                  made, nor can contributed material be returned.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  All submissions may be emailed to the Newsletter Chair or sent
                  via mail:
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:newsletter@area36.org"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    newsletter@area36.org
                  </a>
                  <address className="text-sm text-muted-foreground not-italic">
                    SMAA
                    <br />
                    PO Box 2812
                    <br />
                    Minneapolis, MN 55402
                  </address>
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
