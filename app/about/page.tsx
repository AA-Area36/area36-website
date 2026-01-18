import type React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Triangle, Users, Target, Heart, Briefcase, ExternalLink, Accessibility, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 id="about-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                About Area 36
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Southern Minnesota Area 36 serves as the General Service structure for Alcoholics Anonymous in southern
                Minnesota, connecting groups to A.A. as a whole.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-12 sm:py-16" aria-labelledby="mission-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 id="mission-heading" className="text-3xl font-bold text-foreground">
                  Our Purpose
                </h2>
                <p className="mt-6 text-muted-foreground leading-relaxed">
                  The primary purpose of Area 36 is to facilitate communication within the area and between Area 36 and
                  A.A. members. We serve as a vital link in the chain that connects individual A.A. groups to the
                  General Service Conference and A.A. World Services.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Through assemblies, workshops, and service committees, we work together to carry the message of
                  Alcoholics Anonymous and ensure that our fellowship remains available to all who need it.
                </p>
                <div className="mt-6">
                  <Link
                    href="/committees"
                    className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                  >
                    View our Committees & Officers
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <ValueCard
                  icon={Triangle}
                  title="Unity"
                  description="Working together for our common purpose of carrying the A.A. message."
                />
                <ValueCard
                  icon={Users}
                  title="Service"
                  description="Giving back to the fellowship that saved our lives."
                />
                <ValueCard
                  icon={Target}
                  title="Recovery"
                  description="Supporting the primary purpose of each A.A. group."
                />
                <ValueCard
                  icon={Heart}
                  title="Tradition"
                  description="Guided by our Twelve Traditions in all our affairs."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Structure */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="structure-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="structure-heading" className="text-3xl font-bold text-foreground text-center">
              Area Structure
            </h2>
            <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
              Area 36 is organized into districts, each with elected service positions that work together to serve A.A.
              groups throughout southern Minnesota.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StructureCard
                title="Area Officers"
                items={["Delegate", "Alternate Delegate", "Chair", "Alternate Chair", "Secretary", "Treasurer"]}
                href="/committees"
              />
              <StructureCard
                title="Standing Committees"
                items={["Accessibilities", "Archives", "CPC", "Corrections", "Finance", "Grapevine", "Literature", "Newsletter", "PI", "Registrar", "Structure", "Technology", "Treatment"]}
                href="/committees"
              />
              <StructureCard
                title="Districts"
                items={["26 Geographic Districts", "1 Linguistic District (Spanish)", "DCMs", "GSRs"]}
                href="/districts"
              />
            </div>
          </div>
        </section>

        <section id="accessibility" className="py-12 sm:py-16" aria-labelledby="accessibility-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Accessibility className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h2 id="accessibility-heading" className="text-3xl font-bold text-foreground">
                  Accessibility Commitment
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Area 36 is committed to ensuring that A.A. is accessible to all alcoholics, regardless of ability. Our
                website and events strive to meet WCAG accessibility guidelines.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-2">Website Features</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>High contrast color schemes</li>
                    <li>Adjustable text sizing</li>
                    <li>Dark mode support</li>
                    <li>Screen reader compatibility</li>
                    <li>Keyboard navigation</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-2">Event Accessibility</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>ASL interpretation available on request</li>
                    <li>Wheelchair accessible venues</li>
                    <li>Hybrid/online meeting options</li>
                    <li>Large print materials</li>
                  </ul>
                </div>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                To request accommodations for an Area 36 event, please contact the{" "}
                <Link href="/committees" className="text-primary hover:underline">
                  Accessibilities Committee
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* For Professionals */}
        <section id="professionals" className="py-12 sm:py-16 bg-muted/30" aria-labelledby="professionals-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h2 id="professionals-heading" className="text-3xl font-bold text-foreground">
                  For Professionals
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Are you a professional looking for more information about Alcoholics Anonymous in southern Minnesota?
                A.A. cooperates with professionals who work with alcoholics, including healthcare providers, clergy,
                educators, and others.
              </p>

              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Resources</h3>
                <ul className="space-y-3" role="list">
                  <li>
                    <Link
                      href="https://www.aa.org/aa-for-professionals"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      A.A. Information for Professionals
                      <ExternalLink className="h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://www.aa.org/resources/literature"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      A.A. Literature
                      <ExternalLink className="h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/professionals"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      Area 36 Resources for Professionals
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button asChild>
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function ValueCard({
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

function StructureCard({ title, items, href }: { title: string; items: string[]; href?: string }) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-6 h-full transition-all hover:border-primary/30 hover:shadow-md">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2" role="list">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      {href && (
        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-sm text-primary">Learn more →</span>
        </div>
      )}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
