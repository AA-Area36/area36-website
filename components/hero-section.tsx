import type React from "react"
import Link from "next/link"
import { ArrowRight, Calendar, FileText, Users, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 sm:py-32"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="hero-heading"
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance"
          >
            Southern Minnesota <span className="text-primary">Area 36</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl text-pretty">
            Welcome to the A.A. General Service website for Southern Minnesota Area 36, also known as the Southern
            Minnesota Area Assembly (SMAA).
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/events">
                View Events
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
              <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                Find a Meeting
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAccessCard
            icon={Calendar}
            title="Upcoming Events"
            description="View assemblies, workshops, and service events."
            href="/events"
          />
          <QuickAccessCard
            icon={Newspaper}
            title="Newsletter"
            description="Read the latest Area 36 newsletter online."
            href="/newsletter"
          />
          <QuickAccessCard
            icon={FileText}
            title="Resources"
            description="Access forms, documents, and materials."
            href="/resources"
          />
          <QuickAccessCard
            icon={Users}
            title="Get Involved"
            description="Learn about service and how to participate."
            href="/service"
          />
        </div>
      </div>
    </section>
  )
}

function QuickAccessCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      <ArrowRight
        className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  )
}
