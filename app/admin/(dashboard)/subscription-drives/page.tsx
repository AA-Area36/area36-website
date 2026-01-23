import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Trash2, Image as ImageIcon, Settings, Trophy } from "lucide-react"
import Link from "next/link"
import type { DriveSubmission, DriveSubmissionStatus } from "@/lib/db/schema"
import { getActiveDrive, getDriveSubmissions, getDriveStats, getDriveLeaderboard, approveSubmission, deleteSubmission } from "./actions"
import { DenySubmissionDialog } from "./deny-submission-dialog"
import { LeaderboardChart } from "./leaderboard-chart"

export const dynamic = "force-dynamic"

const statusColors: Record<DriveSubmissionStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AdminSubscriptionDrivesPage() {
  const activeDrive = await getActiveDrive()

  if (!activeDrive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription Drives</h1>
            <p className="text-muted-foreground mt-1">Review and manage subscription drive submissions.</p>
          </div>
          <Button asChild>
            <Link href="/admin/subscription-drives/manage">
              <Settings className="h-4 w-4 mr-2" />
              Manage Drives
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No active subscription drive. Create one in the drive management section.
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = await getDriveStats(activeDrive.id)
  const leaderboard = await getDriveLeaderboard(activeDrive.id)
  const allSubmissions = await getDriveSubmissions(activeDrive.id)

  const pendingSubmissions = allSubmissions.filter((s) => s.status === "pending")
  const approvedSubmissions = allSubmissions.filter((s) => s.status === "approved")
  const deniedSubmissions = allSubmissions.filter((s) => s.status === "denied")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Drives</h1>
          <p className="text-muted-foreground mt-1">
            {activeDrive.name} ({activeDrive.startDate} - {activeDrive.endDate})
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/subscription-drives/manage">
            <Settings className="h-4 w-4 mr-2" />
            Manage Drives
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl">{stats.approvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Subscriptions</CardDescription>
            <CardTitle className="text-3xl">
              {stats.totalApprovedSubscriptions}
              {stats.totalPendingSubscriptions > 0 && (
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  (+{stats.totalPendingSubscriptions})
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leading District</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats.leadingDistrict ? (
                <>
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <span>{stats.leadingDistrict}</span>
                  <span className="text-lg font-normal text-muted-foreground">
                    ({stats.leadingDistrictSubscriptions})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-lg">None yet</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Leaderboard Chart */}
      {leaderboard.length > 0 && (
        <LeaderboardChart leaderboard={leaderboard} />
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingSubmissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingSubmissions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending submissions to review.
              </CardContent>
            </Card>
          ) : (
            pendingSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} showActions />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved submissions.
              </CardContent>
            </Card>
          ) : (
            approvedSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))
          )}
        </TabsContent>

        <TabsContent value="denied" className="space-y-4">
          {deniedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No denied submissions.
              </CardContent>
            </Card>
          ) : (
            deniedSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {allSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No submissions found.
              </CardContent>
            </Card>
          ) : (
            allSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubmissionCard({
  submission,
  showActions = false,
}: {
  submission: DriveSubmission
  showActions?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={statusColors[submission.status]}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">District {submission.district}</h3>
              <span className="text-2xl font-bold text-primary">{submission.subscriptionCount} subscriptions</span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Submitted: {formatDate(submission.submittedAt)}</span>
              {submission.submitterContact && <span>Contact: {submission.submitterContact}</span>}
            </div>

            <div className="mt-4">
              <a
                href={`/api/drive-images/${submission.confirmationImageKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ImageIcon className="h-4 w-4" />
                View Confirmation Image
              </a>
            </div>

            {submission.reviewedBy && (
              <p className="text-xs text-muted-foreground">
                Reviewed by {submission.reviewedBy} on{" "}
                {submission.reviewedAt ? formatDate(submission.reviewedAt) : "unknown date"}
              </p>
            )}
            {submission.status === "denied" && submission.denialReason && (
              <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive">Denial Reason:</p>
                <p className="text-sm text-muted-foreground mt-1">{submission.denialReason}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:min-w-32">
            {showActions ? (
              <>
                <form action={approveSubmission.bind(null, submission.id)}>
                  <Button type="submit" size="sm" className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </form>
                <DenySubmissionDialog submissionId={submission.id} district={submission.district} />
              </>
            ) : (
              <form action={deleteSubmission.bind(null, submission.id)}>
                <Button type="submit" variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
