"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderExplorer } from "./folder-explorer"
import { Loader2, AlertCircle, RefreshCw, CheckCircle2, FolderOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bustFileCaches, cleanupStaleFileMetadata } from "./actions"
import { Badge } from "@/components/ui/badge"
import type { FileMetadataMutationResult, FolderNode, TreeNode } from "./actions"

interface FileMetadata {
  id: string
  driveId: string
  displayName: string
  password: string | null
  category: string | null
  parentFolderId: string
  createdAt: string
  updatedAt: string
}

interface AvailableFolder {
  type: string
  name: string
}

interface InitialData {
  availableFolders: AvailableFolder[]
  metadata: FileMetadata[]
  pendingCacheBustCount?: number
}

interface FolderLoadState {
  loading: boolean
  error: string | null
  data: FolderNode | null
}

function updateNodeMetadata(node: TreeNode, change: FileMetadataMutationResult): TreeNode {
  if (node.type === "file") {
    if (change.type === "upsert" && node.id === change.file.driveId) {
      return {
        ...node,
        hasMetadata: true,
        isProtected: change.file.isProtected,
        displayName: change.file.displayName,
        category: change.file.category,
      }
    }

    if (change.type === "delete" && node.id === change.driveId) {
      return {
        ...node,
        hasMetadata: false,
        isProtected: false,
        displayName: undefined,
        category: null,
      }
    }

    return node
  }

  return {
    ...node,
    children: node.children.map((child) => updateNodeMetadata(child, change)),
  }
}

/**
 * Client-side loader for admin files page
 * Fetches folders individually to spread CPU usage across requests
 */
export function AdminFilesLoader() {
  const [initialData, setInitialData] = useState<InitialData | null>(null)
  const [pendingCacheBustCount, setPendingCacheBustCount] = useState(0)
  const [folderStates, setFolderStates] = useState<Record<string, FolderLoadState>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [initialError, setInitialError] = useState<string | null>(null)
  const [isBustingCache, setIsBustingCache] = useState(false)
  const [isCleaningMetadata, setIsCleaningMetadata] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null)

  // Fetch initial data (available folders + metadata)
  const fetchInitialData = useCallback(async () => {
    setIsInitialLoading(true)
    setInitialError(null)

    try {
      const response = await fetch("/api/admin/files")
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - please log in")
        }
        const errorData = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(errorData.error || `Failed to fetch: ${response.status}`)
      }

      const result = await response.json() as InitialData
      setInitialData(result)
      setPendingCacheBustCount(result.pendingCacheBustCount ?? 0)

      // Initialize folder states
      const states: Record<string, FolderLoadState> = {}
      for (const folder of result.availableFolders) {
        states[folder.type] = { loading: false, error: null, data: null }
      }
      setFolderStates(states)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch"
      setInitialError(message)
      console.error("Admin files initial fetch error:", err)
    } finally {
      setIsInitialLoading(false)
    }
  }, [])

  // Fetch a single folder
  const fetchFolder = useCallback(async (folderType: string) => {
    setFolderStates(prev => ({
      ...prev,
      [folderType]: { ...prev[folderType], loading: true, error: null }
    }))

    try {
      const response = await fetch(`/api/admin/files?folder=${folderType}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(errorData.error || `Failed to fetch ${folderType}`)
      }

      const result = await response.json() as { folder: FolderNode | null }
      
      setFolderStates(prev => ({
        ...prev,
        [folderType]: { loading: false, error: null, data: result.folder }
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to fetch ${folderType}`
      setFolderStates(prev => ({
        ...prev,
        [folderType]: { loading: false, error: message, data: null }
      }))
      console.error(`Admin files folder fetch error (${folderType}):`, err)
    }
  }, [])

  // Fetch all folders (one at a time to spread CPU usage)
  const fetchAllFolders = useCallback(async () => {
    if (!initialData) return

    // Fetch folders sequentially to avoid CPU spikes
    for (const folder of initialData.availableFolders) {
      await fetchFolder(folder.type)
    }
  }, [initialData, fetchFolder])

  const handleMetadataUpdated = useCallback((change: FileMetadataMutationResult) => {
    setPendingCacheBustCount(change.pendingCacheBustCount)

    setInitialData((prev) => {
      if (!prev) return prev

      if (change.type === "upsert") {
        const nextMetadata = [...prev.metadata]
        const index = nextMetadata.findIndex((row) => row.driveId === change.file.driveId)
        const nextRow: FileMetadata = index >= 0
          ? {
              ...nextMetadata[index],
              driveId: change.file.driveId,
              parentFolderId: change.file.parentFolderId,
              displayName: change.file.displayName,
              category: change.file.category,
              password: change.file.isProtected ? (nextMetadata[index]?.password ?? "set") : null,
              updatedAt: new Date().toISOString(),
            }
          : {
              id: `pending-${change.file.driveId}`,
              driveId: change.file.driveId,
              parentFolderId: change.file.parentFolderId,
              displayName: change.file.displayName,
              password: change.file.isProtected ? "set" : null,
              category: change.file.category,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

        if (index >= 0) {
          nextMetadata[index] = nextRow
        } else {
          nextMetadata.push(nextRow)
        }

        return {
          ...prev,
          metadata: nextMetadata,
        }
      }

      return {
        ...prev,
        metadata: prev.metadata.filter((row) => row.driveId !== change.driveId),
      }
    })

    setFolderStates((prev) => {
      const next: Record<string, FolderLoadState> = {}
      for (const [folderType, state] of Object.entries(prev)) {
        next[folderType] = state.data
          ? { ...state, data: updateNodeMetadata(state.data, change) as FolderNode }
          : state
      }
      return next
    })
  }, [])

  const handleBustCache = useCallback(async () => {
    setMaintenanceError(null)
    setMaintenanceMessage(null)
    setIsBustingCache(true)

    try {
      const result = await bustFileCaches()
      if (!result.success) {
        setMaintenanceError(result.message || "Failed to clear caches.")
        return
      }

      setMaintenanceMessage(result.message || "File caches were cleared.")
      setPendingCacheBustCount(result.pendingCacheBustCount ?? 0)
      await fetchInitialData()
    } catch (error) {
      setMaintenanceError(error instanceof Error ? error.message : "Failed to clear caches.")
    } finally {
      setIsBustingCache(false)
    }
  }, [fetchInitialData])

  const handleCleanupStaleMetadata = useCallback(async () => {
    const approved = window.confirm(
      "Clean stale metadata now? This will remove metadata for files that no longer exist or are inside archived folders."
    )
    if (!approved) return

    setMaintenanceError(null)
    setMaintenanceMessage(null)
    setIsCleaningMetadata(true)

    try {
      const result = await cleanupStaleFileMetadata()
      if (!result.success) {
        setMaintenanceError(result.message || "Failed to clean stale metadata.")
        return
      }

      setMaintenanceMessage(result.message || "Stale metadata cleanup completed.")
      setPendingCacheBustCount(result.pendingCacheBustCount ?? 0)
      await fetchInitialData()
    } catch (error) {
      setMaintenanceError(error instanceof Error ? error.message : "Failed to clean stale metadata.")
    } finally {
      setIsCleaningMetadata(false)
    }
  }, [fetchInitialData])

  // Initial load
  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Fetch folders after initial data is loaded
  useEffect(() => {
    if (initialData && Object.keys(folderStates).length > 0) {
      fetchAllFolders()
    }
  }, [initialData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate stats
  const folders = Object.values(folderStates)
    .map(s => s.data)
    .filter((f): f is FolderNode => f !== null)
  
  const metadata = initialData?.metadata || []
  const protectedCount = metadata.filter((m) => m.password).length
  const customNameCount = metadata.length

  // Calculate loading progress
  const totalFolders = initialData?.availableFolders.length || 0
  const loadedFolders = Object.values(folderStates).filter(s => s.data !== null).length
  const loadingFolders = Object.values(folderStates).filter(s => s.loading).length
  const errorFolders = Object.values(folderStates).filter(s => s.error !== null).length

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">File Management</h1>
          <p className="text-muted-foreground mt-1">
            Set custom display names and passwords for files across all Google Drive folders.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm">Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (initialError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">File Management</h1>
          <p className="text-muted-foreground mt-1">
            Set custom display names and passwords for files across all Google Drive folders.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Failed to load: {initialError}
          </p>
          <Button variant="outline" size="sm" onClick={fetchInitialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">File Management</h1>
          <p className="text-muted-foreground mt-1">
            Set custom display names and passwords for files across all Google Drive folders.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBustCache}
            disabled={isBustingCache || isCleaningMetadata}
          >
            {isBustingCache ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Bust Cache
            {pendingCacheBustCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-[10px]">
                {pendingCacheBustCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupStaleMetadata}
            disabled={isCleaningMetadata || isBustingCache}
          >
            {isCleaningMetadata ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clean Stale Metadata
          </Button>
        </div>
      </div>

      {maintenanceMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {maintenanceMessage}
        </div>
      )}
      {maintenanceError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {maintenanceError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Files with Custom Names</CardDescription>
            <CardTitle className="text-3xl">{customNameCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Password Protected</CardDescription>
            <CardTitle className="text-3xl">{protectedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Root Folders</CardDescription>
            <CardTitle className="text-3xl">
              {loadingFolders > 0 ? (
                <span className="flex items-center gap-2">
                  {loadedFolders}/{totalFolders}
                  <Loader2 className="h-5 w-5 animate-spin" />
                </span>
              ) : (
                folders.length
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Folder Loading Progress */}
      {loadingFolders > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Folders...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {initialData?.availableFolders.map(folder => {
                const state = folderStates[folder.type]
                return (
                  <div key={folder.type} className="flex items-center gap-2 text-sm">
                    {state?.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : state?.data ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : state?.error ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={state?.error ? "text-destructive" : ""}>
                      {folder.name}
                      {state?.error && ` - ${state.error}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Summary */}
      {errorFolders > 0 && loadingFolders === 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Some folders failed to load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {initialData?.availableFolders.map(folder => {
                const state = folderStates[folder.type]
                if (!state?.error) return null
                return (
                  <div key={folder.type} className="flex items-center justify-between text-sm">
                    <span>{folder.name}: {state.error}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchFolder(folder.type)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Explorer */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Files</CardTitle>
          <CardDescription>
            Click on a file to edit its display name or set a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {folders.length > 0 ? (
            <FolderExplorer folders={folders} onMetadataUpdated={handleMetadataUpdated} />
          ) : loadingFolders > 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading folder contents...</span>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-8 w-8 mx-auto mb-2" />
              <p>No folders available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Browse the folder tree to find the file you want to customize.</p>
          <p>2. Click the edit button to set a custom display name and optional password.</p>
          <p>3. Files with custom metadata show a &quot;Custom&quot; badge.</p>
          <p>4. Password-protected files show a lock icon and require the password to view or download.</p>
          <p>5. Removing metadata reverts the file to using its original filename with no password.</p>
          <p>6. Use the number on <span className="font-medium">Bust Cache</span> to see how many file changes are pending publish cache sync.</p>
        </CardContent>
      </Card>
    </div>
  )
}
