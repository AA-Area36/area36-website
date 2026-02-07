import type { Metadata } from "next"
import { getUnlockedFolders } from "@/lib/recordings/session"
import { RecordingsLoader } from "./recordings-loader"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = {
  title: "Recordings | Area 36",
  description:
    "Listen to audio recordings from Area 36 assemblies, delegate reports, and workshops.",
}

// Page loads instantly - GDrive data is lazy loaded on client
// Unlocked folders are fetched server-side for security

async function RecordingsWrapper() {
  // Only fetch unlocked folders server-side (for security)
  const unlockedFolders = await getUnlockedFolders()
  return <RecordingsLoader unlockedFolders={unlockedFolders} />
}

export default function RecordingsPage() {
  return (
    <>
      <PageHeader
        title="Recordings"
        description="Listen to audio recordings from Area 36 assemblies, delegate reports, and workshops. These recordings help carry the message of service to those who could not attend in person."
        secondaryDescription="All recordings are shared with permission and may be anonymized. The opinions expressed are those of the speakers and do not necessarily represent Alcoholics Anonymous as a whole."
        secondaryDescriptionClassName="text-sm italic"
        ariaId="recordings-heading"
      />

        {/* Recordings Content - lazy loads from API */}
        <section className="py-12 sm:py-16" aria-label="Audio recordings">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RecordingsWrapper />
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
    </>
  )
}
