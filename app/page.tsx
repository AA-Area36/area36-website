import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/hero-section"
import { EventsPreview } from "@/components/events-preview"
import { DocumentsSection } from "@/components/documents-section"
import { CTASection } from "@/components/cta-section"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <EventsPreview />
        <DocumentsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
