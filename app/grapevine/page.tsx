import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BookOpen, ExternalLink, Mail, PenLine, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { getActiveDrive, getDriveLeaderboard } from "./actions"
// import { SubscriptionDriveSection } from "./subscription-drive-section"
// import { ReCaptchaProvider } from "@/components/recaptcha-provider"

export const dynamic = "force-dynamic"

export default async function GrapevinePage() {
  // const activeDrive = await getActiveDrive()
  // const leaderboard = activeDrive ? await getDriveLeaderboard(activeDrive.id) : []
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="grapevine-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">A.A. Publications</span>
              </div>
              <h1 id="grapevine-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                AA Grapevine & La Viña
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                The AA Grapevine and La Viña are the international journals of Alcoholics Anonymous, sharing the
                experience, strength, and hope of A.A. members in recovery.
              </p>
            </div>
          </div>
        </section>

        {/* What is Grapevine */}
        <section className="py-12 sm:py-16" aria-labelledby="what-is-grapevine-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">
              <div>
                <h2 id="what-is-grapevine-heading" className="text-2xl font-bold text-foreground mb-4">
                  What is the Grapevine?
                </h2>
                <div className="prose prose-muted dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    The AA Grapevine, often called &quot;our meeting in print,&quot; has been published continuously
                    since June 1944. It is a monthly magazine written by A.A. members for A.A. members, featuring
                    stories of recovery, articles on A.A. history, and reflections on the Steps and Traditions.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    La Viña is the Spanish-language counterpart to the Grapevine, serving the Hispanic A.A. community
                    since 1996. Both publications operate as separate arms of A.A.&apos;s General Service Board.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    Unlike other A.A. services, the Grapevine and La Viña are self-supporting through subscriptions
                    and sales of related products. They do not accept group contributions, relying entirely on
                    reader support.
                  </p>
                </div>
                <blockquote className="mt-8 border-l-4 border-primary pl-4 italic text-muted-foreground">
                  &quot;The Grapevine is a mirror of A.A. thought and action worldwide.&quot;
                </blockquote>
              </div>

              <div className="space-y-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                      AA Grapevine
                    </CardTitle>
                    <CardDescription>The English-language A.A. magazine</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Available in print, digital, and audio formats. Features stories, articles, and Daily
                      Reflections.
                    </p>
                    <Button asChild className="w-full">
                      <Link href="https://www.aagrapevine.org" target="_blank" rel="noopener noreferrer">
                        Visit AAGrapevine.org
                        <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                      La Viña
                    </CardTitle>
                    <CardDescription>The Spanish-language A.A. magazine</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Serving the Hispanic A.A. community with stories of recovery in Spanish since 1996.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="https://www.aalavina.org" target="_blank" rel="noopener noreferrer">
                        Visit AALaVina.org
                        <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="get-involved-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="get-involved-heading" className="text-2xl font-bold text-foreground mb-8">
              Ways to Participate
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Subscribe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Support the Grapevine by subscribing to the print or digital edition. Gift subscriptions are also
                    available through the Carry the Message project.
                  </p>
                  <Link
                    href="https://store.aagrapevine.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Visit the Grapevine Store
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <PenLine className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Share Your Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    The Grapevine is written by A.A. members. Consider sharing your experience, strength, and hope by
                    submitting a story for publication.
                  </p>
                  <Link
                    href="https://www.aagrapevine.org/share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Submit Your Story
                    <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Become a GVR/RLV</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your group can elect a Grapevine Representative (GVR) or La Viña Representative (RLV) to share
                    information about these publications.
                  </p>
                  <Link href="/committees" className="text-sm text-primary hover:underline">
                    Contact Area 36 Grapevine Committee
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Area 36 Grapevine Committee */}
        <section className="py-12 sm:py-16" aria-labelledby="area-grapevine-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="max-w-2xl">
                <h2 id="area-grapevine-heading" className="text-2xl font-bold text-foreground mb-4">
                  Area 36 Grapevine Committee
                </h2>
                <p className="text-muted-foreground mb-6">
                  The Area 36 Grapevine Committee coordinates the work of A.A. members, groups, and districts to read,
                  subscribe to, and utilize the Grapevine and Grapevine-produced materials. The committee also
                  encourages members to contribute written material for publication.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link href="mailto:grapevine@area36.org">
                      <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                      Contact Grapevine Chair
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/committees">View All Committees</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Drive Section */}
        {/* {activeDrive && (
          <ReCaptchaProvider>
            <SubscriptionDriveSection drive={activeDrive} leaderboard={leaderboard} />
          </ReCaptchaProvider>
        )} */}

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-80" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-4">Explore the Grapevine</h2>
            <p className="max-w-2xl mx-auto opacity-90 mb-6">
              Whether you subscribe, submit a story, or become a GVR, the Grapevine is a wonderful way to stay
              connected to the broader A.A. fellowship and share in the experience of recovery worldwide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="https://www.aagrapevine.org" target="_blank" rel="noopener noreferrer">
                  Visit Grapevine
                  <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href="https://www.aalavina.org" target="_blank" rel="noopener noreferrer">
                  Visit La Viña
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
