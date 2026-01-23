import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Power, Trash2 } from "lucide-react"
import Link from "next/link"
import type { SubscriptionDrive } from "@/lib/db/schema"
import { getAllDrives, getDriveStats, endDrive } from "../actions"
import { CreateDriveDialog } from "./create-drive-dialog"
import { EditDriveDialog } from "./edit-drive-dialog"

export const dynamic = "force-dynamic"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function ManageDrivesPage() {
  const drives = await getAllDrives()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/subscription-drives">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drive Management</h1>
          <p className="text-muted-foreground mt-1">Create, edit, and manage subscription drives.</p>
        </div>
        <CreateDriveDialog />
      </div>

      <div className="space-y-4">
        {drives.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No subscription drives found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          drives.map((drive) => <DriveCard key={drive.id} drive={drive} />)
        )}
      </div>
    </div>
  )
}

async function DriveCard({ drive }: { drive: SubscriptionDrive }) {
  const stats = await getDriveStats(drive.id)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>{drive.name}</CardTitle>
              <Badge variant={drive.isActive ? "default" : "secondary"}>
                {drive.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardDescription>
              {formatDate(drive.startDate)} - {formatDate(drive.endDate)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <EditDriveDialog drive={drive} />
            {drive.isActive && (
              <form action={endDrive.bind(null, drive.id, false)}>
                <Button variant="outline" size="sm" type="submit">
                  <Power className="h-4 w-4 mr-2" />
                  End Drive
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {drive.description && <p className="text-sm text-muted-foreground">{drive.description}</p>}

        {drive.prizeDescription && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">Prize</p>
            <p className="text-sm text-muted-foreground">{drive.prizeDescription}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold">{stats.pendingCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-lg font-semibold">{stats.approvedCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Subscriptions</p>
            <p className="text-lg font-semibold">
              {stats.totalApprovedSubscriptions}
              {stats.totalPendingSubscriptions > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  (+{stats.totalPendingSubscriptions})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Leading District</p>
            <p className="text-lg font-semibold">
              {stats.leadingDistrict ? (
                <>
                  {stats.leadingDistrict}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({stats.leadingDistrictSubscriptions})
                  </span>
                </>
              ) : (
                "N/A"
              )}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Created: {formatDate(drive.createdAt)} | Last Updated: {formatDate(drive.updatedAt)}
        </p>
      </CardContent>
    </Card>
  )
}
