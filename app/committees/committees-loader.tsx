"use client"

import { useCommittees } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader, GdriveError } from "@/components/gdrive-loader"
import { CommitteesContent } from "./committees-content"
import type { CommitteeData } from "./page"
import type { CommitteeFiles } from "@/lib/gdrive/committees"

interface CommitteesLoaderProps {
  committees: CommitteeData[]
}

/**
 * Lazy loads committee files from the API and renders the CommitteesContent
 * The committees static data is passed from the server
 */
export function CommitteesLoader({ committees }: CommitteesLoaderProps) {
  const { data, isLoading, error, refetch } = useCommittees()

  if (isLoading) {
    return <GdriveLoader message="Loading committee files..." />
  }

  if (error) {
    return <GdriveError error={error} onRetry={refetch} />
  }

  // Even if no files, show the committees with their static info
  const committeeFiles: CommitteeFiles = data || {}

  return <CommitteesContent committees={committees} committeeFiles={committeeFiles} />
}
