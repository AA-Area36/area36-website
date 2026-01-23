import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mic } from "lucide-react"
import { fetchRecordings } from "./actions"
import { RecordingsClient } from "./recordings-client"

// Loading skeleton
function RecordingsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
        <div className="h-10 w-[140px] bg-muted rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-32 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// Empty state
function EmptyState() {
  return (
    <div className="text-center py-16">
      <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No Recordings Available
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Audio recordings of Area 36 events will be available here. Please check
        back soon or contact the Area for more information.
      </p>
    </div>
  )
}

async function RecordingsContent() {
  const { categories, recordings, years } = await fetchRecordings()

  // Calculate total count from the recordings object
  const totalCount = Object.values(recordings).flat().length

  if (totalCount === 0) {
    return <EmptyState />
  }

  return (
    <RecordingsClient
      categories={categories}
      recordings={recordings}
      years={years}
    />
  )
}

export default function RecordingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="recordings-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1
              id="recordings-heading"
              className="text-4xl font-bold text-foreground sm:text-5xl"
            >
              Recordings
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Listen to audio recordings from Area 36 assemblies, delegate reports,
              and workshops. These recordings help carry the message of service to
              those who could not attend in person.
            </p>
            <p className="mt-4 text-sm text-muted-foreground italic">
              All recordings are shared with permission and may be anonymized. The
              opinions expressed are those of the speakers and do not necessarily
              represent Alcoholics Anonymous as a whole.
            </p>
          </div>
        </section>

        {/* Recordings Content */}
        <section className="py-12 sm:py-16" aria-label="Audio recordings">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<RecordingsSkeleton />}>
              <RecordingsContent />
            </Suspense>
          </div>
        </section>

        {/* Info Section */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-label="About recordings">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  About These Recordings
                </h2>
                <p className="text-muted-foreground mb-4">
                  These audio recordings are provided as a service to help carry the
                  message of Alcoholics Anonymous and general service. They include
                  assembly presentations, delegate reports from the General Service
                  Conference, and educational workshops.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you have questions about the recordings or would like to
                  contribute, please contact the Area&apos;s Web Committee.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Using These Recordings
                </h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>
                      Click any recording to start playing. A player will appear at
                      the bottom of the screen.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>
                      Use the search bar to find specific topics or speakers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>
                      Filter by year to find recordings from a specific time period.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>
                      Recordings can be played on any device with a web browser.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
