import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ExternalLink, Lock, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchConferenceMaterials } from "./actions"
import { ConferenceMaterialsContent } from "./conference-materials-content"

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

            <div className="space-y-8">
              {/* 2024 Reports */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">2024</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href="https://www.aa.org/2024-general-service-conference-final-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2024 Final Report (English)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>
                </div>
              </div>

              {/* 2023 Reports */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">2023</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href="https://www.aa.org/2023-general-service-conference-final-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2023 Final Report (English)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>

                  <Link
                    href="https://www.aa.org/es/informe-final-de-la-conferencia-de-servicios-generales-de-2023"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2023 Informe Final (Espanol)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>
                </div>
              </div>

              {/* 2022 Reports */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">2022</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href="https://www.aa.org/2022-general-service-conference-final-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2022 Final Report (English)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>

                  <Link
                    href="https://www.aa.org/es/informe-final-de-la-conferencia-de-servicios-generales-de-2022"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2022 Informe Final (Espanol)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>

                  <Link
                    href="https://www.aa.org/fr/rapport-final-de-la-conference-des-services-generaux-de-2022"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2022 Rapport Final (Francais)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>
                </div>
              </div>

              {/* 2021 Reports */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">2021</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href="https://www.aa.org/2021-general-service-conference-final-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2021 Final Report (English)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>

                  <Link
                    href="https://www.aa.org/es/informe-final-de-la-conferencia-de-servicios-generales-de-2021"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        2021 Informe Final (Espanol)
                      </h4>
                      <p className="text-sm text-muted-foreground">AA.org</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="(opens in new tab)" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Link to AA.org for more reports */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-muted-foreground">
                For earlier reports and additional materials, visit{" "}
                <Link
                  href="https://www.aa.org/general-service-conference"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  AA.org General Service Conference
                  <ExternalLink className="h-3 w-3" aria-label="(opens in new tab)" />
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
