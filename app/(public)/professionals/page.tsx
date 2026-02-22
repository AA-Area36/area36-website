import type { Metadata } from "next"
import { Briefcase, ExternalLink, Mail, Stethoscope, Scale, GraduationCap, Church } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "For Professionals | Area 36",
  description:
    "Information about Alcoholics Anonymous for healthcare providers, legal professionals, educators, and clergy.",
}

export default async function ProfessionalsPage() {
  const locale = await getRequestLocale()
  const professionalsContent = await getContent("professionals", locale)
  const { t } = createTranslator(professionalsContent)

  return (
    <>
      <PageHeader
        variant="featured"
        icon={Briefcase}
        badge={t("header.badge", "Information for Professionals")}
        title={t("header.title", "For Professionals")}
        description={t(
          "header.description",
          "Professionals in many fields come into regular contact with alcoholics and may want more information about Alcoholics Anonymous. We would like to be of help to you!",
        )}
        ariaId="professionals-heading"
      />

        {/* General Information */}
        <section className="py-12 sm:py-16" aria-labelledby="general-info-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">
              <div>
                <h2 id="general-info-heading" className="text-2xl font-bold text-foreground mb-4">
                  {t("generalInfo.title", "General Information")}
                </h2>
                <div className="prose prose-muted dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {t(
                      "generalInfo.paragraph1",
                      "General information about how A.A. can be of help to professionals can be found on the For Professionals page of AA.org. There you will find resources specifically designed for healthcare providers, legal professionals, educators, clergy, and others who work with alcoholics.",
                    )}
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    {t(
                      "generalInfo.paragraph2",
                      "A.A. does not provide medical advice, diagnose alcoholism, or offer professional treatment. However, we can share information about how A.A. works and how it has helped millions of people recover from alcoholism.",
                    )}
                  </p>
                </div>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="https://www.aa.org/aa-for-professionals" target="_blank" rel="noopener noreferrer">
                      {t("generalInfo.buttonLabel", "Visit AA.org For Professionals")}
                      <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </Button>
                </div>
              </div>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>{t("resourceCard.title", "Resources from AA.org")}</CardTitle>
                  <CardDescription>
                    {t("resourceCard.description", "Materials designed specifically for professionals")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/if-you-are-professional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("resourceCard.links.item1", "If You Are a Professional")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/aa-resource-health-care-professional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("resourceCard.links.item2", "A.A. as a Resource for Healthcare Professionals")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/aa-resource-drug-alcohol-court-professionals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("resourceCard.links.item3", "A.A. as a Resource for Drug and Alcohol Court Professionals")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/about-aa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("resourceCard.links.item4", "About A.A. - Newsletter for Professionals")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/understanding-anonymity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {t("resourceCard.links.item5", "Understanding Anonymity")}
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* For Different Professionals */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="professionals-types-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="professionals-types-heading" className="text-2xl font-bold text-foreground mb-8">
              {t("professions.title", "A.A. Works With Many Professionals")}
            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Stethoscope className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{t("professions.healthcare.title", "Healthcare")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "professions.healthcare.description",
                      "Doctors, nurses, counselors, and mental health professionals often encounter patients who may benefit from A.A.",
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{t("professions.legal.title", "Legal")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "professions.legal.description",
                      "Judges, attorneys, probation officers, and law enforcement professionals work with individuals who may need help with alcoholism.",
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{t("professions.education.title", "Education")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "professions.education.description",
                      "Teachers, school counselors, and administrators may encounter students or families affected by alcoholism.",
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Church className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{t("professions.clergy.title", "Clergy")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "professions.clergy.description",
                      "Pastors, chaplains, and religious leaders are often the first to hear from those struggling with alcohol problems.",
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Southern Minnesota Information */}
        <section className="py-12 sm:py-16" aria-labelledby="local-info-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="max-w-2xl">
                <h2 id="local-info-heading" className="text-2xl font-bold text-foreground mb-4">
                  {t("southernMinnesota.title", "Southern Minnesota Information")}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t(
                    "southernMinnesota.paragraph1",
                    "For information specifically about how A.A. can be of help to professionals in southern Minnesota, please contact our Cooperation with the Professional Community (CPC) Committee Chair or any of the relevant Area 36 Committee Chairs and Officers.",
                  )}
                </p>
                <p className="text-muted-foreground mb-6">
                  {t(
                    "southernMinnesota.paragraph2",
                    "Our CPC Committee works to inform professionals about what A.A. is, what A.A. does, and what A.A. does not do. We are happy to provide presentations, literature, or answer questions about A.A. in our area.",
                  )}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link href="mailto:cpc@area36.org">
                      <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t("southernMinnesota.cpcButtonLabel", "Contact CPC Committee")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/committees">
                      {t("southernMinnesota.committeesButtonLabel", "View All Committees")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What A.A. Can Offer */}
        <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-80" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-4">{t("offer.title", "What We Can Offer")}</h2>
            <p className="max-w-2xl mx-auto opacity-90 mb-6">
              {t(
                "offer.description",
                "A.A. members are available to share information about the A.A. program, provide literature, speak to groups, and answer questions. We cannot provide professional advice, but we can share our experience.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="/contact">{t("offer.contactButtonLabel", "Contact Area 36")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                  {t("offer.meetingButtonLabel", "Find a Meeting")}
                  <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                </Link>
              </Button>
            </div>
          </div>
      </section>
    </>
  )
}
