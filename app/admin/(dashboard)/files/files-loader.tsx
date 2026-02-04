"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderExplorer } from "./folder-explorer"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FolderNode } from "./actions"

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

interface AdminFilesData {
  folders: FolderNode[]
  metadata: FileMetadata[]
}

/**
 * Client-side loader for admin files page
 * Fetches data from API to avoid loading GDrive modules at build time
 */
export function AdminFilesLoader() {
  const [data, setData] = useState<AdminFilesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/files")
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - please log in")
        }
        const errorData = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(errorData.error || `Failed to fetch files: ${response.status}`)
      }

      const result = await response.json() as AdminFilesData
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch files"
      setError(message)
      console.error("Admin files fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
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
          <p className="text-sm">Loading files from Google Drive...</p>
        </div>
      </div>
    )
  }

  if (error) {
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
            Failed to load files: {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const folders = data?.folders || []
  const metadata = data?.metadata || []
  const protectedCount = metadata.filter((m) => m.password).length
  const customNameCount = metadata.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">File Management</h1>
        <p className="text-muted-foreground mt-1">
          Set custom display names and passwords for files across all Google Drive folders.
        </p>
      </div>

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
            <CardTitle className="text-3xl">{folders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Folder Explorer */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Files</CardTitle>
          <CardDescription>
            Click on a file to edit its display name or set a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FolderExplorer folders={folders} />
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
        </CardContent>
      </Card>
    </div>
  )
}
