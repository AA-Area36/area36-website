import type { Metadata } from "next"
import { NewsletterLoader } from "./newsletter-loader"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = {
  title: "The Pigeon Newsletter | Area 36",
  description:
    "Read the latest issue of The Pigeon, Area 36's quarterly General Service newsletter.",
}

// Page loads instantly - GDrive data is lazy loaded on client

export default function NewsletterPage() {
  return (
    <>
      <PageHeader
        variant="compact"
        title="The Pigeon"
        description="The Pigeon is a General Service paper newsletter published four times a year by the Southern Minnesota Area Assembly of Alcoholics Anonymous. An anonymized digital version is available on this website."
        secondaryDescription="The Pigeon presents the experience and opinions of A.A. members and others interested in the A.A. program. Opinions expressed herein are not to be attributed to Alcoholics Anonymous as a whole, nor does publication of any article imply endorsement by either A.A. or the Southern MN Area Assembly."
        secondaryDescriptionClassName="text-sm italic"
        maxWidth="2xl"
        ariaId="newsletter-heading"
      />

        {/* Newsletter Viewer - lazy loads from API */}
        <section className="py-8 sm:py-12" aria-label="Newsletter viewer">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <NewsletterLoader />
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
    </>
  )
}
