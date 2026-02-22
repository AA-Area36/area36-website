import type { Metadata } from "next"
import {
  ExternalLink,
  Briefcase,
  Hand,
  Accessibility,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResourcesLoader } from "./resources-loader"
import { PageHeader } from "@/components/page-header"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Resources | Area 36",
  description:
    "Access forms, documents, delegate reports, and other materials for A.A. service work in Area 36.",
}

// Page loads instantly - GDrive data is lazy loaded on client

export default async function ResourcesPage() {
  const locale = await getRequestLocale()
  const resourcesContent = await getContent("resources", locale)
  const { t } = createTranslator(resourcesContent)

  return (
    <>
      <PageHeader
        title={t("header.title", "Resources")}
        description={t(
          "header.description",
          "Access forms, documents, delegate reports, and other materials to support your service work in Area 36.",
        )}
        ariaId="resources-heading"
      />

        {/* Quick Links */}
        <section className="py-8 border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                  {t("quickLinks.findMeeting", "Find a Meeting")}
                  <ExternalLink className="ml-2 h-3 w-3" aria-label="(opens in new tab)" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/newsletter">{t("quickLinks.newsletter", "Latest Newsletter")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/service-basics">{t("quickLinks.serviceBasics", "Service Basics")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/recordings">{t("quickLinks.recordings", "Recordings")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="#asl">{t("quickLinks.asl", "ASL Resources")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Documents Tabs - lazy loads from API */}
        <section className="py-12 sm:py-16" aria-label="Documents and forms">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ResourcesLoader />
          </div>
        </section>

        {/* Special Sections */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-label="Additional resources">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* For Professionals */}
              <Card id="professionals">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Briefcase className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>{t("cards.professionals.title", "For Professionals")}</CardTitle>
                  <CardDescription>
                    {t(
                      "cards.professionals.description",
                      "Resources for healthcare providers, educators, clergy, and other professionals.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/aa-for-professionals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("cards.professionals.link1", "A.A. for Professionals (AA.org)")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/aa-resource-health-care-professional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("cards.professionals.link2", "A.A. as a Resource for Healthcare")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link href="/professionals" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    {t("cards.professionals.link3", "Area 36 Resources for Professionals →")}
                  </Link>
                </CardContent>
              </Card>

              {/* Temporary Contact / Bridging the Gap */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Hand className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>{t("cards.tcp.title", "Temporary Contact Programs")}</CardTitle>
                  <CardDescription>
                    {t(
                      "cards.tcp.description",
                      "Bridging the Gap and pre-release contact information for those leaving treatment or corrections.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "cards.tcp.body",
                      "Help newcomers make their first meeting by becoming a temporary contact or requesting a contact for someone you know.",
                    )}
                  </p>
                  <Link href="/temporary-contact-programs" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    {t("cards.tcp.tcpLink", "Learn About TCP →")}
                  </Link>
                  <Link href="/treatment-temporary-contact-program" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    {t("cards.tcp.treatmentLink", "Treatment TCP →")}
                  </Link>
                  <Link href="/corrections-temporary-contact-program" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    {t("cards.tcp.correctionsLink", "Corrections TCP →")}
                  </Link>
                </CardContent>
              </Card>

              {/* ASL Resources */}
              <Card id="asl">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Accessibility className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>{t("cards.asl.title", "ASL Resources")}</CardTitle>
                  <CardDescription>
                    {t("cards.asl.description", "Resources for deaf and hard of hearing members.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/accessibility-resources"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("cards.asl.linkLabel", "A.A. Accessibility Resources")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "cards.asl.body",
                      "To request ASL interpretation for an Area 36 event, please contact the Accessibility Committee.",
                    )}
                  </p>
                  <Link href="/committees" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    {t("cards.asl.contactLink", "Contact Accessibility Committee →")}
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* External Links */}
        <section className="py-12 sm:py-16" aria-labelledby="external-links-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="external-links-heading" className="text-2xl font-bold text-foreground mb-6">
              {t("external.title", "A.A. Resources")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: t("external.links.aaOrg.name", "AA.org"),
                  url: "https://www.aa.org",
                  description: t("external.links.aaOrg.description", "Official A.A. website"),
                },
                {
                  name: t("external.links.grapevine.name", "AA Grapevine"),
                  url: "https://www.aagrapevine.org",
                  description: t("external.links.grapevine.description", "Meeting in print"),
                },
                {
                  name: t("external.links.laVina.name", "La Viña"),
                  url: "https://www.aalavina.org",
                  description: t("external.links.laVina.description", "Spanish-language Grapevine"),
                },
                {
                  name: t("external.links.findMeeting.name", "Find a Meeting"),
                  url: "https://www.aa.org/find-aa",
                  description: t("external.links.findMeeting.description", "Meeting finder"),
                },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {link.name}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </div>
                  <span className="text-sm text-muted-foreground mt-1">{link.description}</span>
                </Link>
              ))}
            </div>
          </div>
      </section>
    </>
  )
}
