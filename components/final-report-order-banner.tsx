"use client"

import * as React from "react"
import { ArrowUpRight, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useServiceResources } from "@/lib/hooks/use-gdrive-files"
import type { ServiceResource } from "@/lib/gdrive/service-resources"

const STORAGE_KEY = "a36_final_report_ordering_banner_dismissed"
const FINAL_REPORT_PROCESS_FILENAME = "en final report process communication"

function normalizeFilename(value: string): string {
  return value
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function findFinalReportProcessResource(
  resources: ServiceResource[],
): ServiceResource | undefined {
  return resources.find((resource) =>
    normalizeFilename(resource.fileName || resource.name) === FINAL_REPORT_PROCESS_FILENAME,
  )
}

export function FinalReportOrderBanner() {
  const [dismissed, setDismissed] = React.useState(true) // Start hidden to prevent flash
  const { data } = useServiceResources()
  const resource = React.useMemo(
    () => findFinalReportProcessResource(data || []),
    [data],
  )

  React.useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true"
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser storage is unavailable during the server render.
    setDismissed(isDismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setDismissed(true)
  }

  if (dismissed || !resource) return null

  return (
    <section
      aria-label="Final Report ordering announcement"
      className="relative overflow-hidden border-b border-primary/20 bg-primary text-primary-foreground"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-15 sm:block"
        aria-hidden="true"
      >
        <div className="absolute -right-8 -top-16 h-44 w-44 rounded-full border-[24px] border-white" />
        <div className="absolute right-32 top-8 h-20 w-20 rounded-full border-[14px] border-white" />
      </div>

      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="min-w-0 flex-1 text-sm leading-snug">
          <span className="font-semibold">Ordering General Service Conference Final Reports.</span>{" "}
          <span className="hidden text-primary-foreground/80 sm:inline">
            Find the process and instructions for requesting printed reports.
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="secondary" size="sm" className="hidden shadow-sm sm:inline-flex">
            <a
              href={resource.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View ordering guide
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
          <a
            href={resource.previewUrl}
            className="inline-flex rounded-md px-2 py-1.5 text-sm font-semibold underline underline-offset-4 hover:bg-white/10 sm:hidden"
            target="_blank"
            rel="noopener noreferrer"
          >
            View guide
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss Final Report ordering announcement"
            className="rounded-md p-1.5 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
