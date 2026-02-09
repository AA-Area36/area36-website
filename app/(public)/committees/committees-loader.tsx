"use client"

import { useCommittees } from "@/lib/hooks/use-gdrive-files"
import { GdriveLoader } from "@/components/gdrive-loader"
import { CommitteesContent } from "./committees-content"
import type { CommitteeData } from "./page"
import type { CommitteeFiles } from "@/lib/gdrive/committees"

interface CommitteesLoaderProps {
  committees: CommitteeData[]
}

/**
 * Lazy loads committee files from the API and renders the CommitteesContent
 * The committees static data is passed from the server
 * 
 * GRACEFUL DEGRADATION: If files fail to load, committees are still shown
 * without their files. This ensures the page remains usable even if GDrive
 * is unavailable.
 */
export function CommitteesLoader({ committees }: CommitteesLoaderProps) {
  const { data, isLoading, error } = useCommittees()

  if (isLoading) {
    return <GdriveLoader message="Loading committee files..." />
  }

  // Graceful degradation: log error but show committees without files
  if (error) {
    console.error("Failed to load committee files:", error)
  }

  // Even if no files or error, show the committees with their static info
  const committeeFiles: CommitteeFiles = data || {}

  return <CommitteesContent committees={committees} committeeFiles={committeeFiles} />
}
