import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Building2, Mail, ArrowLeft, UserPlus, HandHeart } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CorrectionsTCPPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="corrections-tcp-heading"
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
                  <Building2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Corrections</span>
              </div>
              <h1 id="corrections-tcp-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                Corrections Temporary Contact Program
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Helping alcoholics transition from correctional facilities to the A.A. community.
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
                    For individuals in or leaving a correctional facility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    If you are currently incarcerated or about to be released and want help connecting with A.A.
                    meetings in your community, we can help. A temporary contact is an A.A. member who will:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      Meet you or contact you after your release
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
                      To request a temporary contact, reach out to our Corrections Temporary Contact Coordinator:
                    </p>
                    <Button asChild className="w-full">
                      <Link href="mailto:ctcp@area36.org">
                        <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                        ctcp@area36.org
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
                    Become a temporary contact for corrections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Service work is essential to recovery. As a temporary contact, you&apos;ll help newcomers make the
                    critical transition from incarceration to the A.A. community. Requirements include:
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
                      To volunteer as a temporary contact, reach out to our Corrections Temporary Contact Coordinator:
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="mailto:ctcp@area36.org">
                        <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                        ctcp@area36.org
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pink Can Plan */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="pink-can-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="max-w-2xl">
                <h2 id="pink-can-heading" className="text-2xl font-bold text-foreground mb-4">
                  The Pink Can Plan
                </h2>
                <p className="text-muted-foreground mb-4">
                  The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional
                  facilities. Contributions to the Pink Can Plan help provide literature, support for meetings inside
                  facilities, and other resources.
                </p>
                <p className="text-muted-foreground mb-6">
                  To learn more or contribute to the Pink Can Plan, contact the Pink Can Coordinator.
                </p>
                <Button asChild>
                  <Link href="mailto:pinkcanplan@area36.org">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    pinkcanplan@area36.org
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
                Corrections Committee
              </h2>
              <p className="text-muted-foreground mb-6">
                The Area 36 Corrections Committee coordinates the work of A.A. groups in carrying the A.A. message to
                alcoholics in correctional facilities. For more information about corrections work in Area 36:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild>
                  <Link href="mailto:corrections@area36.org">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    corrections@area36.org
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
