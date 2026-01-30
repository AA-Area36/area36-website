import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ExternalLink, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchConferenceMaterials, fetchOldConferenceReports } from "./actions"
import { ConferenceMaterialsContent } from "./conference-materials-content"
import { FinalReportsContent } from "./final-reports-content"

// Loading skeleton
function MaterialsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

async function ConferenceMaterialsWrapper() {
  const materials = await fetchConferenceMaterials()
  return <ConferenceMaterialsContent materials={materials} />
}

async function FinalReportsWrapper() {
  const oldReports = await fetchOldConferenceReports()
  return <FinalReportsContent oldReports={oldReports} />
}

export default function GeneralServiceConferencePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
          className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
          aria-labelledby="gsc-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 id="gsc-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
              General Service Conference
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Background materials, agenda items, advisory actions, and final reports from the General Service Conference.
            </p>
          </div>
        </section>

        {/* Background Material */}
        <section className="py-12 sm:py-16" aria-labelledby="background-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="background-heading" className="text-2xl font-bold text-foreground mb-4">
              Background Material
            </h2>

            <p className="text-muted-foreground mb-8 max-w-4xl">
              Every spring Alcoholics Anonymous holds a General Service Conference where discussions take place
              and decisions are voted on by area delegates, General Service Board trustees, and General Service
              Office staff. To help members of Alcoholics Anonymous come to an informed group conscience before
              the conference, the General Service Office prepares a list of agenda items along with background
              material for each item.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Password Protected Materials
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Some conference materials are password protected. If you need to know the password, please
                      reach out to your District Committee Member (DCM). Please do not share these materials
                      with people outside of Alcoholics Anonymous.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Button asChild>
                  <Link
                    href="https://docs.google.com/forms/d/e/1FAIpQLSdZr8uTcHTJabem6gGVvNghjNe4mdtc2-xtvDKxWIqxp_4XRA/viewform?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    2025 General Service Conference Agenda Items and Background Material
                    <ExternalLink className="ml-2 h-4 w-4" aria-label="(opens in new tab)" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Conference Materials from Google Drive */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="materials-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="materials-heading" className="text-2xl font-bold text-foreground mb-6">
              Conference Advisory Actions
            </h2>
            <p className="text-muted-foreground mb-8">
              Advisory actions and agenda items from recent General Service Conferences.
            </p>

            <Suspense fallback={<MaterialsSkeleton />}>
              <ConferenceMaterialsWrapper />
            </Suspense>
          </div>
        </section>

        {/* Final Reports */}
        <section className="py-12 sm:py-16" aria-labelledby="reports-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="reports-heading" className="text-2xl font-bold text-foreground mb-6">
              Final Reports
            </h2>
            <p className="text-muted-foreground mb-8">
              Complete final reports from past General Service Conferences, available in multiple languages.
            </p>

            <Suspense fallback={<MaterialsSkeleton />}>
              <FinalReportsWrapper />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
