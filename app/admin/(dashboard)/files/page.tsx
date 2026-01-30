import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getFolderStructure, getAllFileMetadata } from "./actions"
import { FolderExplorer } from "./folder-explorer"

export const dynamic = "force-dynamic"

export default async function AdminFilesPage() {
  const [folders, metadata] = await Promise.all([
    getFolderStructure(),
    getAllFileMetadata(),
  ])

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
