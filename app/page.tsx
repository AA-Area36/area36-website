import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/hero-section"
import { EventsPreview } from "@/components/events-preview"
import { DocumentsSection } from "@/components/documents-section"
import { TCPHighlight } from "@/components/tcp-highlight"
import { CTASection } from "@/components/cta-section"
import { AffiliatedSites } from "@/components/affiliated-sites"

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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <Suspense fallback={<EventsSkeleton />}>
          <EventsPreview />
        </Suspense>
        <TCPHighlight />
        <Suspense fallback={<DocumentsSkeleton />}>
          <DocumentsSection />
        </Suspense>
        <CTASection />
        <AffiliatedSites />
      </main>
      <Footer />
    </div>
  )
}
