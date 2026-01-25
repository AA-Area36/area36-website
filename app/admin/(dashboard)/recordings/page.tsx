import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, FolderLock, Key, Copy } from "lucide-react"
import { getRecordingFolders, deleteRecordingFolder } from "./actions"
import { AddFolderDialog } from "./add-folder-dialog"
import { EditFolderDialog } from "./edit-folder-dialog"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function handleDelete(id: string) {
  "use server"
  await deleteRecordingFolder(id)
  revalidatePath("/admin/recordings")
}

export default async function AdminRecordingsPage() {
  const folders = await getRecordingFolders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recording Folders</h1>
          <p className="text-muted-foreground mt-1">
            Manage password-protected recording folders. Only folders listed here will appear on the recordings page.
          </p>
        </div>
        <AddFolderDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Folders</CardDescription>
            <CardTitle className="text-3xl">{folders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Folders List */}
      <div className="space-y-4">
        {folders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No recording folders configured. Add a folder to get started.
            </CardContent>
          </Card>
        ) : (
          folders.map((folder) => (
            <Card key={folder.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <FolderLock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{folder.folderName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Drive ID: <code className="bg-muted px-1 rounded text-xs">{folder.driveId}</code>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Key className="h-3 w-3 text-muted-foreground" />
                        <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">{folder.password}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EditFolderDialog folder={folder} />
                    <form action={handleDelete.bind(null, folder.id)}>
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add a folder by providing its Google Drive folder ID and a password.</p>
          <p>2. Only folders registered here will appear on the public recordings page.</p>
          <p>3. Users must enter the correct password to access recordings in each folder.</p>
          <p>4. Once unlocked, the folder remains accessible for 24 hours.</p>
        </CardContent>
      </Card>
    </div>
  )
}
