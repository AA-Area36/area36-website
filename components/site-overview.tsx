import Link from "next/link"
import { ArrowRight, Heart, Users, Briefcase, ExternalLink } from "lucide-react"

export function SiteOverview() {
  return (
    <section className="py-12 sm:py-16 border-b border-border" aria-labelledby="site-overview-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="site-overview-heading" className="sr-only">
          How can we help?
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Need Help? */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Need Help?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              If you or someone you know has a drinking problem, A.A. can help.
            </p>
            <ul className="mt-4 space-y-2" role="list">
              <li>
                <Link
                  href="https://www.aa.org/find-aa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Find a Meeting
                  <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Contact Us
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Active in Service? */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Active in Service?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Find everything you need to support your service work in Area 36.
            </p>
            <ul className="mt-4 space-y-2" role="list">
              <li>
                <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  Events <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/committees" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  Committees <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  Resources <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/districts" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  Districts <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>

          {/* For Professionals */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              A Professional?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Resources for healthcare, legal, education, and other professionals.
            </p>
            <ul className="mt-4 space-y-2" role="list">
              <li>
                <Link href="/professionals" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  Professional Resources <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  Get in Touch <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
