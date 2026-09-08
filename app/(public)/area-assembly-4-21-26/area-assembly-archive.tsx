import { BookOpen, CalendarDays, ExternalLink } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AreaAssemblyArchive() {
  return (
    <>
      <PageHeader
        title="April 2026 Area Assembly / Delegates Workshop"
        description="This event has concluded and registration is closed."
        secondaryDescription="The page remains available as an archive and no longer exposes expired meeting access details."
        variant="featured"
        icon={CalendarDays}
        badge="Archived event"
        maxWidth="2xl"
        ariaId="area-assembly-archive-heading"
      />

      <section className="pb-12 sm:pb-16" aria-labelledby="registration-closed-heading">
        <div className="mx-auto grid max-w-4xl gap-6 px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle id="registration-closed-heading">Registration closed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Registration for the April 18 and April 21, 2026 workshop dates is no longer accepted.
              </p>
              <p>
                Visit the events calendar for current Area 36 workshops, assemblies, and service events.
              </p>
              <Button asChild>
                <Link href="/events">View current events</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Conference background material
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                General Service Conference materials remain available in the conference archive.
              </p>
              <Button asChild variant="outline">
                <Link href="/general-service-conference#background-heading">
                  Open background material
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
