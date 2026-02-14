import type React from "react"
import Link from "next/link"
import { ArrowRight, Calendar, FileText, Users, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRequestLocale } from "@/lib/i18n/get-locale"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"

export async function HeroSection() {
  const locale = await getRequestLocale()
  const homeContent = await getContent("home", locale)
  const { t } = createTranslator(homeContent)
  const involvedHrefRaw = t("hero.quickCards.involved.href", "/service-basics")
  const involvedHref = involvedHrefRaw === "/service" ? "/service-basics" : involvedHrefRaw

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
            {t("hero.headingPrefix", "Southern Minnesota")}{" "}
            <span className="text-primary">{t("hero.headingAccent", "Area 36")}</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl text-pretty">
            {t(
              "hero.intro",
              "Welcome to the A.A. General Service website for Southern Minnesota Area 36, also known as the Southern Minnesota Area Assembly (SMAA).",
            )}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={t("hero.buttons.events.href", "/events")}>
                {t("hero.buttons.events.label", "View Events")}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
              <Link href={t("hero.buttons.meeting.href", "https://www.aa.org/find-aa")} target="_blank" rel="noopener noreferrer">
                {t("hero.buttons.meeting.label", "Find a Meeting")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAccessCard
            icon={Calendar}
            title={t("hero.quickCards.events.title", "Upcoming Events")}
            description={t("hero.quickCards.events.description", "View assemblies, workshops, and service events.")}
            href={t("hero.quickCards.events.href", "/events")}
          />
          <QuickAccessCard
            icon={Newspaper}
            title={t("hero.quickCards.newsletter.title", "Newsletter")}
            description={t("hero.quickCards.newsletter.description", "Read the latest Area 36 newsletter online.")}
            href={t("hero.quickCards.newsletter.href", "/newsletter")}
          />
          <QuickAccessCard
            icon={FileText}
            title={t("hero.quickCards.resources.title", "Resources")}
            description={t("hero.quickCards.resources.description", "Access forms, documents, and materials.")}
            href={t("hero.quickCards.resources.href", "/resources")}
          />
          <QuickAccessCard
            icon={Users}
            title={t("hero.quickCards.involved.title", "Get Involved")}
            description={t("hero.quickCards.involved.description", "Learn about service and how to participate.")}
            href={involvedHref}
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
