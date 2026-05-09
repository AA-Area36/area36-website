import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"
import { HeroSection } from "@/components/hero-section"
import { EventsPreview } from "@/components/events-preview"
import { DocumentsSection } from "@/components/documents-section"
import { TCPHighlight } from "@/components/tcp-highlight"
import { CTASection } from "@/components/cta-section"
import { AffiliatedSites } from "@/components/affiliated-sites"
import { SiteOverview } from "@/components/site-overview"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Home | Southern Minnesota Area 36",
  description:
    "Southern Minnesota Area 36 serves as the General Service structure for A.A. in southern Minnesota. Find events, resources, and service information.",
}

function EventsSkeleton() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-5 w-96 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}

function DocumentsSkeleton() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-5 w-96 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <section className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">Temporary Notice</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Conference Manual counts due June 1</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Tell us how many Conference Manuals you want to purchase this year so Area 36 can plan the order.
                  </p>
                </div>
              </div>
              <Button asChild className="sm:self-start">
                <Link href="/conference-manual-count">
                  Submit manual count
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <SiteOverview />
      <Suspense fallback={<EventsSkeleton />}>
        <EventsPreview />
      </Suspense>
      <TCPHighlight />
      <Suspense fallback={<DocumentsSkeleton />}>
        <DocumentsSection />
      </Suspense>
      <CTASection />
      <AffiliatedSites />
    </>
  )
}
