import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Heart, Mail, MapPin, CreditCard, Building, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ContributePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="contribute-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 id="contribute-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                Contribute
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Supporting Area 36 through the Seventh Tradition helps carry the message of Alcoholics Anonymous
                throughout southern Minnesota.
              </p>
            </div>
          </div>
        </section>

        {/* 7th Tradition Explanation */}
        <section className="py-12 sm:py-16" aria-labelledby="seventh-tradition-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Heart className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 id="seventh-tradition-heading" className="text-2xl font-bold text-foreground">
                    The Seventh Tradition
                  </h2>
                </div>
                <blockquote className="border-l-4 border-primary pl-4 italic text-lg text-muted-foreground mb-6">
                  &quot;Every A.A. group ought to be fully self-supporting, declining outside contributions.&quot;
                </blockquote>
                <div className="prose prose-muted dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    The Seventh Tradition ensures that A.A. remains independent and free from outside influences. When
                    we contribute to the work of A.A., we help support the services that made our recovery possible and
                    ensure they will be available to others.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    Contributions to Area 36 help fund assemblies, workshops, delegate expenses, literature, and the
                    many service activities that carry the A.A. message across southern Minnesota.
                  </p>
                </div>
              </div>

              <Card className="bg-primary text-primary-foreground border-0">
                <CardHeader>
                  <CardTitle className="text-primary-foreground">How Contributions Are Used</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "Area Assemblies and Committee Meetings",
                    "Delegate expenses to General Service Conference",
                    "Literature and service materials",
                    "Communication and outreach",
                    "Public Information and CPC activities",
                    "Accessibility services and translation",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contribution Methods */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="contribution-methods-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="contribution-methods-heading" className="text-2xl font-bold text-foreground mb-8">
              Ways to Contribute
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Mail */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Mail className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>By Mail</CardTitle>
                  <CardDescription>Send a check payable to &quot;SMAA&quot;</CardDescription>
                </CardHeader>
                <CardContent>
                  <address className="not-italic text-muted-foreground leading-relaxed">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" aria-hidden="true" />
                      <div>
                        SMAA
                        <br />
                        P.O. Box 2812
                        <br />
                        Minneapolis, MN 55402
                      </div>
                    </div>
                  </address>
                  <p className="text-sm text-muted-foreground mt-4">
                    Please include your group name and number (if applicable) on the check memo line.
                  </p>
                </CardContent>
              </Card>

              {/* Online */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <CreditCard className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Online</CardTitle>
                  <CardDescription>Contribute securely online via PayPal or card</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Make a one-time or recurring contribution through our secure online portal.
                  </p>
                  <Button className="w-full">Contribute Online</Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Secure payment processed by PayPal. No PayPal account required.
                  </p>
                </CardContent>
              </Card>

              {/* Bank Transfer */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Building className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Bank Transfer</CardTitle>
                  <CardDescription>Direct bank transfer or ACH</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    For bank transfer information, please contact the Area Treasurer.
                  </p>
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href="mailto:treasurer@area36.org">Contact Treasurer</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Group Contributions */}
        <section className="py-12 sm:py-16" aria-labelledby="group-contributions-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 id="group-contributions-heading" className="text-2xl font-bold text-foreground mb-4">
                For Groups: Suggested Contribution Split
              </h2>
              <p className="text-muted-foreground mb-6">
                After meeting expenses, many groups use the following suggested split for their Seventh Tradition
                contributions:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { percent: "50%", recipient: "District", description: "Local service" },
                  { percent: "30%", recipient: "Area 36", description: "Regional service" },
                  { percent: "10%", recipient: "Intergroup", description: "Local coordination" },
                  { percent: "10%", recipient: "GSO", description: "A.A. World Services" },
                ].map((split) => (
                  <div key={split.recipient} className="rounded-lg border border-border bg-card p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{split.percent}</div>
                    <div className="font-semibold text-foreground mt-2">{split.recipient}</div>
                    <div className="text-xs text-muted-foreground mt-1">{split.description}</div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground mt-6">
                This is a suggested split and may vary based on your group&apos;s conscience. The important thing is
                that your group contributes what it can to support A.A. at all levels.
              </p>

              <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">GSO Contribution Address</h3>
                <address className="not-italic text-muted-foreground text-sm">
                  General Service Office
                  <br />
                  P.O. Box 2407
                  <br />
                  James A. Farley Station
                  <br />
                  New York, NY 10116-2407
                </address>
                <p className="text-sm text-muted-foreground mt-3">
                  Or contribute online at{" "}
                  <Link
                    href="https://www.aa.org/contribute"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    aa.org/contribute
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Thank You */}
        <section className="py-12 sm:py-16 bg-primary/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-foreground mb-4">Thank You</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your contributions help ensure that A.A.&apos;s hand will always be there when the next suffering
              alcoholic reaches out for help. Thank you for supporting Area 36 and the work of Alcoholics Anonymous.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
