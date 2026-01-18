import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Stethoscope, Mail, ArrowLeft, UserPlus, HandHeart } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TreatmentTCPPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="treatment-tcp-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <Link
                href="/temporary-contact"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Temporary Contact Program
              </Link>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Stethoscope className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Treatment</span>
              </div>
              <h1 id="treatment-tcp-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                Treatment Temporary Contact Program
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Helping alcoholics transition from treatment programs to the A.A. community.
              </p>
            </div>
          </div>
        </section>

        {/* Two Paths */}
        <section className="py-12 sm:py-16" aria-labelledby="paths-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="paths-heading" className="sr-only">How to Participate</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {/* For Newcomers */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <UserPlus className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Need a Temporary Contact?</CardTitle>
                  <CardDescription>
                    For individuals in or leaving a treatment program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    If you are currently in treatment or about to be discharged and want help connecting with A.A.
                    meetings in your community, we can help. A temporary contact is an A.A. member who will:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Meet you or contact you after your discharge
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Take you to your first A.A. meeting
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Introduce you to other members
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Help you find meetings in your area
                    </li>
                  </ul>
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      To request a temporary contact, reach out to our Treatment Temporary Contact Coordinator:
                    </p>
                    <Button asChild className="w-full">
                      <Link href="mailto:ttcc@area36.org">
                        <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                        ttcc@area36.org
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* For Volunteers */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <HandHeart className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Want to Volunteer?</CardTitle>
                  <CardDescription>
                    Become a temporary contact for treatment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Service work is essential to recovery. As a temporary contact, you&apos;ll help newcomers make the
                    critical transition from treatment to the A.A. community. Requirements include:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Commitment to A.A. and your own sobriety
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Willingness to meet newcomers and attend meetings
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Understanding of A.A. principles and traditions
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Compassion and patience
                    </li>
                  </ul>
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      To volunteer as a temporary contact, reach out to our Treatment Temporary Contact Coordinator:
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="mailto:ttcc@area36.org">
                        <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                        ttcc@area36.org
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Bridging the Gap */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="bridging-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="max-w-2xl">
                <h2 id="bridging-heading" className="text-2xl font-bold text-foreground mb-4">
                  Bridging the Gap
                </h2>
                <p className="text-muted-foreground mb-4">
                  &quot;Bridging the Gap&quot; is a common term for the Temporary Contact Program in treatment
                  settings. The goal is simple: help newcomers bridge the gap between treatment and their first A.A.
                  meeting in the community.
                </p>
                <p className="text-muted-foreground mb-6">
                  Many treatment facilities work with A.A. to connect their clients with temporary contacts before
                  discharge. If you work at a treatment facility and would like to learn more about this program,
                  please contact our Treatment Committee.
                </p>
                <Button asChild>
                  <Link href="mailto:treatment@area36.org">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    treatment@area36.org
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 sm:py-16" aria-labelledby="contact-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 id="contact-heading" className="text-2xl font-bold text-foreground mb-4">
                Treatment Committee
              </h2>
              <p className="text-muted-foreground mb-6">
                The Area 36 Treatment Committee leads and coordinates the work of A.A. members and groups in carrying
                the A.A. message to alcoholics in treatment facilities. For more information about treatment work in
                Area 36:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild>
                  <Link href="mailto:treatment@area36.org">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    treatment@area36.org
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/committees">View All Committees</Link>
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
