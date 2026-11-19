import { useMemo } from "react"
import {
  useBackgroundMaterials,
  useCommittees,
  useConferenceMaterials,
  useNewsletters,
  useResources,
  useServiceResources,
} from "@/lib/hooks/use-gdrive-files"
import { buildDocumentEntries } from "@/lib/search/documents"
import type { CalendarFile } from "../events/calendar-file-actions"

export function useDocumentCatalogs(enabled: boolean, calendars: CalendarFile[]) {
  const options = { enabled }
  const resources = useResources(options)
  const committees = useCommittees(options)
  const service = useServiceResources(options)
  const newsletters = useNewsletters(options)
  const conference = useConferenceMaterials(options)
  const background = useBackgroundMaterials(options)
  const catalogs = [resources, committees, service, newsletters, conference, background]
  const documents = useMemo(() => buildDocumentEntries({
    resources: resources.data,
    committees: committees.data,
    service: service.data,
    newsletters: newsletters.data?.newsletters,
    conference: [...(conference.data?.materials ?? []), ...(conference.data?.oldReports ?? [])],
    background: background.data,
    calendars,
  }), [resources.data, committees.data, service.data, newsletters.data, conference.data, background.data, calendars])

  const failed = catalogs.filter((catalog) => catalog.error)
  return {
    documents,
    loading: enabled && catalogs.some((catalog) => catalog.isLoading || (!catalog.data && !catalog.error)),
    hasErrors: failed.length > 0,
    retry: () => Promise.allSettled(failed.map((catalog) => catalog.refetch())),
  }
}
