import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Briefcase, ExternalLink, Mail, Stethoscope, Scale, GraduationCap, Church } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProfessionalsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="professionals-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Briefcase className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Information for Professionals</span>
              </div>
              <h1 id="professionals-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                For Professionals
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Professionals in many fields come into regular contact with alcoholics and may want more information
                about Alcoholics Anonymous. We would like to be of help to you!
              </p>
            </div>
          </div>
        </section>

        {/* General Information */}
        <section className="py-12 sm:py-16" aria-labelledby="general-info-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">
              <div>
                <h2 id="general-info-heading" className="text-2xl font-bold text-foreground mb-4">
                  General Information
                </h2>
                <div className="prose prose-muted dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    General information about how A.A. can be of help to professionals can be found on the For
                    Professionals page of AA.org. There you will find resources specifically designed for healthcare
                    providers, legal professionals, educators, clergy, and others who work with alcoholics.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    A.A. does not provide medical advice, diagnose alcoholism, or offer professional treatment. However,
                    we can share information about how A.A. works and how it has helped millions of people recover from
                    alcoholism.
                  </p>
                </div>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="https://www.aa.org/aa-for-professionals" target="_blank" rel="noopener noreferrer">
                      Visit AA.org For Professionals
                      <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </Button>
                </div>
              </div>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Resources from AA.org</CardTitle>
                  <CardDescription>Materials designed specifically for professionals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="https://www.aa.org/if-you-are-professional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    If You Are a Professional
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/aa-resource-health-care-professional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. as a Resource for Healthcare Professionals
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/aa-resource-drug-alcohol-court-professionals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    A.A. as a Resource for Drug and Alcohol Court Professionals
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/about-aa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    About A.A. - Newsletter for Professionals
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                  <Link
                    href="https://www.aa.org/understanding-anonymity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    Understanding Anonymity
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
              A.A. Works With Many Professionals
            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Stethoscope className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Healthcare</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Doctors, nurses, counselors, and mental health professionals often encounter patients who may
                    benefit from A.A.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Legal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Judges, attorneys, probation officers, and law enforcement professionals work with individuals who
                    may need help with alcoholism.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Education</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Teachers, school counselors, and administrators may encounter students or families affected by
                    alcoholism.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Church className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Clergy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Pastors, chaplains, and religious leaders are often the first to hear from those struggling with
                    alcohol problems.
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
                  Southern Minnesota Information
                </h2>
                <p className="text-muted-foreground mb-6">
                  For information specifically about how A.A. can be of help to professionals in southern Minnesota,
                  please contact our Cooperation with the Professional Community (CPC) Committee Chair or any of the
                  relevant Area 36 Committee Chairs and Officers.
                </p>
                <p className="text-muted-foreground mb-6">
                  Our CPC Committee works to inform professionals about what A.A. is, what A.A. does, and what A.A.
                  does not do. We are happy to provide presentations, literature, or answer questions about A.A. in
                  our area.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link href="mailto:cpc@area36.org">
                      <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                      Contact CPC Committee
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/committees">
                      View All Committees
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
            <h2 className="text-2xl font-bold mb-4">What We Can Offer</h2>
            <p className="max-w-2xl mx-auto opacity-90 mb-6">
              A.A. members are available to share information about the A.A. program, provide literature, speak to
              groups, and answer questions. We cannot provide professional advice, but we can share our experience.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="/contact">Contact Area 36</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer">
                  Find a Meeting
                  <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
