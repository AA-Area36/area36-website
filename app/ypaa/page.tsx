import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Users, ExternalLink, Calendar, MapPin, Heart, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function YPAAPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24"
          aria-labelledby="ypaa-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Users className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Young People in A.A.</span>
              </div>
              <h1 id="ypaa-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
                YPAA
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Young People in Alcoholics Anonymous (YPAA) is for A.A. members of all ages who identify as young people
                or young at heart. If you think you&apos;re young, you&apos;re young!
              </p>
            </div>
          </div>
        </section>

        {/* What is YPAA */}
        <section className="py-12 sm:py-16" aria-labelledby="what-is-ypaa-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">
              <div>
                <h2 id="what-is-ypaa-heading" className="text-2xl font-bold text-foreground mb-4">
                  What is YPAA?
                </h2>
                <div className="prose prose-muted dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    YPAA committees exist to make Alcoholics Anonymous more accessible and welcoming to younger
                    alcoholics. While there is no official age requirement, YPAA groups and events provide a space where
                    young people can connect with others who share similar experiences.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    YPAA is not separate from A.A. - it is A.A. for young people. YPAA committees organize events,
                    conferences, and activities that help carry the message to young alcoholics who might otherwise feel
                    out of place.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    Whether you got sober at 18 or 45, if you feel young in sobriety, YPAA is for you!
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
                      Why YPAA Matters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-muted-foreground">
                    <p>
                      Alcoholism does not discriminate by age. Many young people struggle with alcohol before they ever
                      have a legal drink.
                    </p>
                    <p>
                      YPAA helps young people find others who understand their unique challenges - from not yet having a
                      career to still living with parents to navigating sober dating.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* MNYPAA and ICYPAA */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="ypaa-organizations-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="ypaa-organizations-heading" className="text-2xl font-bold text-foreground mb-8">
              YPAA Organizations
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* MNYPAA */}
              <Card>
                <CardHeader>
                  <CardTitle>MNYPAA</CardTitle>
                  <CardDescription>Minnesota Young People in A.A.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    MNYPAA is the statewide YPAA committee for Minnesota, organizing events, conferences, and service
                    opportunities for young people across the state.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Annual Minnesota Young People&apos;s Conference</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Events throughout Minnesota</span>
                    </div>
                  </div>
                  <Button asChild className="w-full mt-4">
                    <Link href="https://mnypaa.org" target="_blank" rel="noopener noreferrer">
                      Visit MNYPAA.org
                      <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* ICYPAA */}
              <Card>
                <CardHeader>
                  <CardTitle>ICYPAA</CardTitle>
                  <CardDescription>International Conference of Young People in A.A.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    ICYPAA is the largest annual gathering of young people in A.A., bringing together thousands of young
                    alcoholics from around the world for a weekend of recovery, fellowship, and fun.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Annual international conference</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span>Rotating host cities worldwide</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full mt-4 bg-transparent">
                    <Link href="https://icypaa.org" target="_blank" rel="noopener noreferrer">
                      Visit ICYPAA.org
                      <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Find YPAA Meetings */}
        <section className="py-12 sm:py-16" aria-labelledby="find-meetings-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <div className="max-w-2xl">
                <h2 id="find-meetings-heading" className="text-2xl font-bold text-foreground mb-4">
                  Find YPAA Meetings
                </h2>
                <p className="text-muted-foreground mb-6">
                  Many areas have meetings specifically for young people, or meetings that attract a younger crowd.
                  Check the A.A. meeting finder or contact your local intergroup to find YPAA-friendly meetings in your
                  area.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link href="https://aaminneapolis.org/meetings/#/?type=young-people-attend" target="_blank" rel="noopener noreferrer">
                      Minneapolis Area
                      <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/contact">
                      Contact Area 36
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-80" aria-hidden="true" />
            <h2 className="text-2xl font-bold mb-4">Get Involved</h2>
            <p className="max-w-2xl mx-auto opacity-90 mb-6">
              Whether you want to attend a YPAA event, start a young people&apos;s meeting, or get involved in YPAA
              service, there are many ways to connect with young people in A.A.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="secondary">
                <Link href="https://mnypaa.org" target="_blank" rel="noopener noreferrer">
                  Connect with MNYPAA
                  <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link href="/events">View Area 36 Events</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
