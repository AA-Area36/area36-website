import type { ServiceResource } from "./service-resources"

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
