"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Heart, Mail, MapPin, CreditCard, CheckCircle, AlertCircle, Info, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ContributePage() {
  const [isAAMember, setIsAAMember] = React.useState<boolean | null>(null)

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

        {/* AA Membership Check */}
        <section className="py-8 sm:py-12 border-b border-border" aria-labelledby="membership-check-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              {isAAMember === null ? (
                <Card className="border-primary/20">
                  <CardHeader className="text-center pb-4">
                    <CardTitle id="membership-check-heading" className="text-xl">
                      Before You Contribute
                    </CardTitle>
                    <CardDescription className="text-base">
                      Are you a member of Alcoholics Anonymous?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center gap-4">
                    <Button onClick={() => setIsAAMember(true)} size="lg">
                      Yes, I am an A.A. member
                    </Button>
                    <Button onClick={() => setIsAAMember(false)} variant="outline" size="lg">
                      No
                    </Button>
                  </CardContent>
                </Card>
              ) : isAAMember === false ? (
                <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Thank You for Your Interest</h3>
                        <p className="text-muted-foreground">
                          Thank you for your interest in supporting Alcoholics Anonymous. However, in keeping with
                          A.A.&apos;s Seventh Tradition of self-support, we accept contributions only from A.A. members.
                        </p>
                        <p className="text-muted-foreground mt-4">
                          If you or someone you know needs help with a drinking problem, please visit{" "}
                          <Link href="https://www.aa.org/find-aa" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            aa.org/find-aa
                          </Link>{" "}
                          to find a meeting near you.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setIsAAMember(null)}
                        >
                          Go Back
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Thank you. Please scroll down to view contribution options.</span>
                  <button
                    onClick={() => setIsAAMember(null)}
                    className="text-primary hover:underline ml-2"
                  >
                    Change answer
                  </button>
                </div>
              )}
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
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Short Form</p>
                    <blockquote className="border-l-4 border-primary pl-4 italic text-lg text-muted-foreground">
                      &quot;Every A.A. group ought to be fully self-supporting, declining outside contributions.&quot;
                    </blockquote>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Long Form</p>
                    <blockquote className="border-l-4 border-primary/50 pl-4 italic text-sm text-muted-foreground">
                      &quot;The A.A. groups themselves ought to be fully supported by the voluntary contributions of
                      their own members. We think that each group should soon achieve this ideal; that any public
                      solicitation of funds using the name of Alcoholics Anonymous is highly dangerous, whether by
                      groups, clubs, hospitals, or other outside agencies; that acceptance of large gifts from any
                      source, or of contributions carrying any obligation whatever, is unwise. Then too, we view with
                      much concern those A.A. treasuries which continue, beyond prudent reserves, to accumulate funds
                      for no stated A.A. purpose. Experience has often warned us that nothing can so surely destroy our
                      spiritual heritage as futile disputes over property, money, and authority.&quot;
                    </blockquote>
                  </div>
                </div>
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
                        Southern Minnesota Area Assembly
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
                  <CardDescription>Contribute securely online via PayPal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full">
                    <Link
                      href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RBJBLHJQP9WZC"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contribute via PayPal
                    </Link>
                  </Button>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Or send directly via PayPal app/website to:
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      treasurer@area36.org
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">In the PayPal notes, please include:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>Type: Group, Individual, Birthday, or Pink Can Plan</li>
                          <li>Group name and service ID (if group contribution)</li>
                          <li>For birthday contributions credited to your group, include group info</li>
                        </ul>
                        <p className="mt-2">Contributions acknowledged via email unless otherwise indicated.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pink Can Plan */}
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Heart className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle>Pink Can Plan</CardTitle>
                  <CardDescription>Send a check payable to &quot;Pink Can Plan&quot;</CardDescription>
                </CardHeader>
                <CardContent>
                  <address className="not-italic text-muted-foreground leading-relaxed">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" aria-hidden="true" />
                      <div>
                        Pink Can Plan Coordinator
                        <br />
                        PO Box 41633
                        <br />
                        Plymouth, MN 55441-0633
                      </div>
                    </div>
                  </address>
                  <p className="text-sm text-muted-foreground mt-4">
                    The Pink Can Plan is a separate fund dedicated to carrying the A.A. message to those in correctional facilities.
                  </p>
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
                    href="https://contribution.aa.org/"
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

        {/* Resources */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="resources-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="resources-heading" className="text-2xl font-bold text-foreground mb-6">
              Learn More About Self-Support
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="https://www.aa.org/self-support-where-money-and-spirituality-mix"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">Self-Support: Where Money and Spirituality Mix</span>
              </Link>
              <Link
                href="https://www.aa.org/aa-group-treasurer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">The A.A. Group Treasurer</span>
              </Link>
              <Link
                href="https://www.aa.org/seventh-tradition-fact-sheet-your-seventh-tradition-contributions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">Your Seventh Tradition Contributions</span>
              </Link>
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
