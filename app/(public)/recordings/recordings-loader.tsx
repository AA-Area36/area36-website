"use client"

import * as React from "react"
import { useRecordings } from "@/lib/hooks/use-gdrive-files"
import { GdriveError, GdriveLoader } from "@/components/gdrive-loader"
import { RecordingsClient } from "./recordings-client"
import { Mic } from "lucide-react"
import type { CategoryInfo, Recording } from "@/lib/gdrive/types"

interface RecordingsLoaderProps {
  unlockedFolders: string[]
}

/**
 * Lazy loads recordings from the API and renders the RecordingsClient
 * Unlocked folders must be passed from server for security
 * 
 * Keeps a service outage distinct from a legitimate empty archive.
 */
export function RecordingsLoader({ unlockedFolders }: RecordingsLoaderProps) {
  const { data, isLoading, error, refetch } = useRecordings()

  if (isLoading) {
    return <GdriveLoader message="Loading recordings..." />
  }

  if (error && !data) {
    return <GdriveError resourceName="Recordings" onRetry={refetch} />
  }

  if (!data) {
    return <EmptyState />
  }

  // Process data similar to the original server component
  const { categories, recordings, years, registeredFolders } = data

  // Create a map of registered folder driveIds to names
  const registeredFolderMap = new Map(
    registeredFolders.map(f => [f.driveId, f.folderName])
  )

  // Filter categories to only include registered folders
  const filteredCategories = categories.filter(cat => 
    cat.folderId && registeredFolderMap.has(cat.folderId)
  )

  // Update category names to use registered folder names
  const categoriesWithNames: CategoryInfo[] = filteredCategories.map(cat => ({
    ...cat,
    name: cat.folderId ? registeredFolderMap.get(cat.folderId) || cat.name : cat.name,
  }))

  // Filter recordings to only include those from registered AND unlocked folders
  // This is critical for security - locked folder recordings should never be displayed
  const filteredRecordings: Record<string, Recording[]> = {}
  for (const cat of filteredCategories) {
    if (recordings[cat.id]) {
      // Only include recordings if folder is unlocked (or has no folderId = public)
      const isUnlocked = !cat.folderId || unlockedFolders.includes(cat.folderId)
      if (isUnlocked) {
        filteredRecordings[cat.id] = recordings[cat.id]
      } else {
        // For locked folders, send empty array (category visible but no recordings data)
        filteredRecordings[cat.id] = []
      }
    }
  }

  // Calculate total count from the filtered recordings
  const totalCount = Object.values(filteredRecordings).flat().length

  if (totalCount === 0 && filteredCategories.length === 0) {
    return <EmptyState />
  }

  return (
    <RecordingsClient
      categories={categoriesWithNames}
      recordings={filteredRecordings}
      years={years}
      unlockedFolders={unlockedFolders}
    />
  )
}

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
