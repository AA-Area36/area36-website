import type { Metadata } from "next"
import { Lock } from "lucide-react"
import { ConferenceMaterialsLoader, FinalReportsLoader, BackgroundMaterialsLoader } from "./conference-materials-loader"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = {
  title: "General Service Conference | Area 36",
  description:
    "Conference background materials, agenda items, advisory actions, and final reports.",
}

// Page loads instantly - GDrive data is lazy loaded on client

export default function GeneralServiceConferencePage() {
  return (
    <>
      <PageHeader
        title="General Service Conference"
        description="Background materials, agenda items, advisory actions, and final reports from the General Service Conference."
        ariaId="gsc-heading"
      />

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

              {/* Dynamic file loader for background materials */}
              <BackgroundMaterialsLoader />
            </div>
          </div>
        </section>

        {/* Conference Materials from Google Drive - lazy loads from API */}
        <section className="py-12 sm:py-16 bg-muted/30" aria-labelledby="materials-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="materials-heading" className="text-2xl font-bold text-foreground mb-6">
              Conference Advisory Actions
            </h2>
            <p className="text-muted-foreground mb-8">
              Advisory actions and agenda items from recent General Service Conferences.
            </p>

            <ConferenceMaterialsLoader />
          </div>
        </section>

        {/* Final Reports - lazy loads from API */}
        <section className="py-12 sm:py-16" aria-labelledby="reports-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 id="reports-heading" className="text-2xl font-bold text-foreground mb-6">
              Final Reports
            </h2>
            <p className="text-muted-foreground mb-8">
              Complete final reports from past General Service Conferences, available in multiple languages.
            </p>

            <FinalReportsLoader />
          </div>
      </section>
    </>
  )
}
