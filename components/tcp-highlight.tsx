import Link from "next/link"
import { Hand, ArrowRight, Building2, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TCPHighlight() {
  return (
    <section className="py-16 sm:py-24 bg-primary/5" aria-labelledby="tcp-highlight-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Hand className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-primary uppercase tracking-wide">Bridging the Gap</span>
            </div>
            <h2 id="tcp-highlight-heading" className="text-3xl font-bold text-foreground">
              Temporary Contact Program
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The Temporary Contact Program (TCP) helps alcoholics in corrections or treatment facilities make the
              transition to the A.A. community. One of the more &quot;slippery&quot; places in the journey to sobriety
              is between the doors to the facility and the nearest A.A. meeting.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Whether you need a temporary contact or want to volunteer as one, we&apos;re here to help bridge that gap.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/temporary-contact">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/temporary-contact/corrections"
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Corrections TCP</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                For those transitioning from correctional facilities
              </p>
              <ArrowRight
                className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/temporary-contact/treatment"
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Stethoscope className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Treatment TCP</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                For those transitioning from treatment programs
              </p>
              <ArrowRight
                className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
