import type { Metadata } from "next"
import { Hand, ArrowRight, Heart, Users, Building2, Stethoscope } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { getContent } from "@/lib/content/repo"
import { createTranslator } from "@/lib/content/t"
import { getRequestLocale } from "@/lib/i18n/get-locale"

export const metadata: Metadata = {
  title: "Temporary Contact Programs | Area 36",
  description:
    "Bridging the gap from corrections and treatment facilities to the A.A. community through temporary contacts.",
}

export default async function TemporaryContactProgramsPage() {
  const locale = await getRequestLocale()
  const temporaryContactProgramsContent = await getContent("temporaryContactPrograms", locale)
  const { t } = createTranslator(temporaryContactProgramsContent)

  return (
    <>
      <PageHeader
        variant="featured"
        icon={Hand}
        badge={t("header.badge", "Bridging the Gap")}
        title={t("header.title", "Temporary Contact Program")}
        description={t(
          "header.description",
          "Helping alcoholics make the transition from corrections or treatment facilities to the A.A. community.",
        )}
        ariaId="tcp-heading"
      />

        {/* About TCP */}
        <section className="py-12 sm:py-16" aria-labelledby="about-tcp-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">
              <div>
                <h2 id="about-tcp-heading" className="text-2xl font-bold text-foreground mb-4">
                  {t("about.title", "What is the Temporary Contact Program?")}
                </h2>
                <div className="prose prose-muted dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {t(
                      "about.paragraph1",
                      "Alcoholics Anonymous has a single purpose of helping individuals who identify as alcoholics to find sobriety through attendance at A.A. meetings and participation with the Fellowship of A.A.",
                    )}
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    {t(
                      "about.paragraph2",
                      "The Temporary Contact Program (TCP) is an opportunity for alcoholics in a corrections institution or a treatment program to attend Alcoholics Anonymous meetings soon after their discharge from the corrections or treatment facility. The TCP is designed to help alcoholics in a corrections institution or treatment facility make the transition to the Alcoholics Anonymous community.",
                    )}
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    {t(
                      "about.paragraph3",
                      "One of the more \"slippery\" places in the journey to sobriety is between the doors to the facility and the nearest A.A. group or meeting. The Temporary Contact Program is designed to bridge the gap between the facility and A.A. to help the newcomer with that transition.",
                    )}
                  </p>
                </div>
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-2">
                    <Heart className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>{t("whyItMatters.title", "Why It Matters")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {t(
                      "whyItMatters.intro",
                      "The transition from a structured environment to everyday life can be challenging. A temporary contact can:",
                    )}
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {t("whyItMatters.items.0", "Help you find your first meeting")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {t("whyItMatters.items.1", "Introduce you to other A.A. members")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {t("whyItMatters.items.2", "Answer questions about A.A.")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {t("whyItMatters.items.3", "Provide support during the transition")}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Program Options */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="programs-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 id="programs-heading" className="text-2xl font-bold text-foreground">
                {t("programs.title", "Choose Your Program")}
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                {t(
                  "programs.description",
                  "Whether you're coming from a corrections facility or treatment program, we have a temporary contact program to help you.",
                )}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {/* Corrections TCP */}
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Building2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>{t("programs.corrections.title", "Corrections TCP")}</CardTitle>
                  <CardDescription>
                    {t("programs.corrections.subtitle", "For individuals transitioning from correctional facilities")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {t(
                      "programs.corrections.body",
                      "If you are currently in or being released from a correctional facility and would like help connecting with A.A., or if you would like to volunteer as a temporary contact for those in corrections, this program is for you.",
                    )}
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/corrections-temporary-contact-program">
                      {t("programs.corrections.buttonLabel", "Corrections TCP")}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Treatment TCP */}
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Stethoscope className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>{t("programs.treatment.title", "Treatment TCP")}</CardTitle>
                  <CardDescription>
                    {t("programs.treatment.subtitle", "For individuals transitioning from treatment programs")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {t(
                      "programs.treatment.body",
                      "If you are currently in or being discharged from a treatment program and would like help connecting with A.A., or if you would like to volunteer as a temporary contact for those in treatment, this program is for you.",
                    )}
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/treatment-temporary-contact-program">
                      {t("programs.treatment.buttonLabel", "Treatment TCP")}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-80" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-4">
              {t("volunteer.title", "Volunteer as a Temporary Contact")}
            </h2>
            <p className="max-w-2xl mx-auto opacity-90 mb-6">
              {t(
                "volunteer.description",
                "Service is a vital part of recovery. By becoming a temporary contact, you can help another alcoholic make the critical transition from a facility to the A.A. community. Your experience and support can make all the difference.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="/corrections-temporary-contact-program">
                  {t("volunteer.correctionsButtonLabel", "Corrections Volunteers")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href="/treatment-temporary-contact-program">
                  {t("volunteer.treatmentButtonLabel", "Treatment Volunteers")}
                </Link>
              </Button>
            </div>
          </div>
      </section>
    </>
  )
}
