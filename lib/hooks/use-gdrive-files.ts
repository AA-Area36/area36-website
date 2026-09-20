"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const requests = new Map<string, Promise<unknown>>()
// Share in-flight public catalog requests; never retain private recordings data.
async function fetchCatalog(type: string) {
  const existing = type === "recordings" ? undefined : requests.get(type)
  if (existing) return existing
  const request = (async () => {
    const response = await fetch(`/api/gdrive/${type}`)
    if (!response.ok) throw new Error(`Files are temporarily unavailable (${response.status}).`)
    return response.json()
  })()
  if (type !== "recordings") requests.set(type, request)
  try { return await request } finally { if (type !== "recordings") requests.delete(type) }
}

type GDriveType = 
  | "recordings" 
  | "newsletters" 
  | "resources" 
  | "committees" 
  | "service-resources" 
  | "conference-materials"
  | "background-materials"

interface UseGdriveFilesOptions {
  enabled?: boolean
}

interface UseGdriveFilesResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to lazy load files from the GDrive API
 * 
 * @param type - The type of files to fetch (recordings, newsletters, etc.)
 * @param options - Optional configuration
 * @returns Object with data, loading state, error, and refetch function
 */
export function useGdriveFiles<T>(
  type: GDriveType,
  options: UseGdriveFilesOptions = {}
): UseGdriveFilesResult<T> {
  const { enabled = true } = options
  const generation = useRef(0)
  
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return
    const requestGeneration = ++generation.current

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCatalog(type)
      if (generation.current === requestGeneration) setData(result as T)
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to fetch ${type}`
      if (generation.current === requestGeneration) setError(message)
      console.error(`GDrive fetch error (${type}):`, err)
    } finally {
      if (generation.current === requestGeneration) setIsLoading(false)
    }
  }, [type, enabled])

  useEffect(() => {
    const activeGeneration = generation
    // eslint-disable-next-line react-hooks/set-state-in-effect -- This effect intentionally starts the hook's request lifecycle.
    fetchData()
    return () => { activeGeneration.current++ }
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

// Type-safe wrapper hooks for each resource type
import type { CategoryInfo, Recording, Newsletter, ResourcesByCategory, Resource } from "@/lib/gdrive/types"
import type { CommitteeFiles } from "@/lib/gdrive/committees"
import type { ServiceResource } from "@/lib/gdrive/service-resources"

export interface RecordingsData {
  categories: CategoryInfo[]
  recordings: Record<string, Recording[]>
  years: number[]
  registeredFolders: { driveId: string; folderName: string }[]
}

export interface NewslettersData {
  newsletters: Newsletter[]
  years: number[]
}

export interface ConferenceMaterialsData {
  materials: Resource[]
  oldReports: Resource[]
}

export function useRecordings(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<RecordingsData>("recordings", options)
}

export function useNewsletters(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<NewslettersData>("newsletters", options)
}

export function useResources(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<ResourcesByCategory>("resources", options)
}

export function useCommittees(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<CommitteeFiles>("committees", options)
}

export function useServiceResources(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<ServiceResource[]>("service-resources", options)
}

export function useConferenceMaterials(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<ConferenceMaterialsData>("conference-materials", options)
}

export interface BackgroundFile {
  id: string
  name: string
  displayName: string
  previewUrl: string
  downloadUrl: string
  size?: string
  mimeType: string
  isProtected: boolean
  /** True when the file's Drive folder is not publicly shared. */
  isRestricted?: boolean
}

export interface BackgroundMaterialsData {
  agendaItems: BackgroundFile[]
  backgroundMaterials: BackgroundFile[]
  advisoryActions: BackgroundFile[]
  miscFiles: BackgroundFile[]
}

export function useBackgroundMaterials(options?: UseGdriveFilesOptions) {
  return useGdriveFiles<BackgroundMaterialsData>("background-materials", options)
}
