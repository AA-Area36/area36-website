"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Trophy, Calendar, Gift } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { SubmitConfirmationDialog } from "./submit-confirmation-dialog"
import type { SubscriptionDrive } from "@/lib/db/schema"
import type { DriveLeaderboardEntry } from "./actions"

interface SubscriptionDriveSectionProps {
  drive: SubscriptionDrive
  leaderboard: DriveLeaderboardEntry[]
}

export function SubscriptionDriveSection({ drive, leaderboard }: SubscriptionDriveSectionProps) {
  const formatDate = (dateString: string) => {
    // Parse as local date by appending T00:00:00 (avoids UTC interpretation)
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  // Prepare chart data - show top 10 districts
  const chartData = leaderboard.slice(0, 10).map((entry) => ({
    district: `District ${entry.district}`,
    approved: entry.approved,
    pending: entry.pending,
  }))

  const totalApproved = leaderboard.reduce((sum, entry) => sum + entry.approved, 0)
  const totalPending = leaderboard.reduce((sum, entry) => sum + entry.pending, 0)
  const leadingDistrict = leaderboard.length > 0 ? leaderboard[0] : null

  const chartConfig = {
    approved: {
      label: "Approved",
      theme: {
        light: "oklch(0.45 0.18 300)",
        dark: "oklch(0.6 0.18 300)",
      },
    },
    pending: {
      label: "Pending",
      theme: {
        light: "oklch(0.45 0.18 300 / 0.4)",
        dark: "oklch(0.6 0.18 300 / 0.4)",
      },
    },
  } satisfies ChartConfig

  return (
    <section id="drive" className="py-12 sm:py-16 bg-purple-50 dark:bg-purple-950/20" aria-labelledby="subscription-drive-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <h2 id="subscription-drive-heading" className="text-2xl font-bold text-foreground">
              {drive.name}
            </h2>
          </div>
          {drive.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">{drive.description}</p>
          )}
        </div>

        {/* Main Content: Stacked Stats + Chart */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr] mb-8">
          {/* Left: Stacked Stats Cards */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Current Leader
                </CardDescription>
                <CardTitle>
                  {leadingDistrict ? (
                    <>
                      District {leadingDistrict.district}
                      <span className="block text-lg font-normal text-muted-foreground">
                        {leadingDistrict.approved} subscriptions
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-lg font-normal">No submissions yet</span>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Drive Ends
                </CardDescription>
                <CardTitle>{formatDate(drive.endDate)}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Subscriptions</CardDescription>
                <CardTitle className="text-4xl">
                  {totalApproved}
                  {totalPending > 0 && (
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      (+{totalPending} pending)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Right: Stacked Bar Chart */}
          {chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>District Leaderboard</CardTitle>
                <CardDescription>Top districts by subscription count</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <YAxis
                      dataKey="district"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      width={80}
                    />
                    <XAxis type="number" hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="approved"
                      stackId="a"
                      fill="var(--color-approved)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      stackId="a"
                      fill="var(--color-pending)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[320px] text-muted-foreground">
                No submissions yet. Be the first to submit!
              </CardContent>
            </Card>
          )}
        </div>

        {/* Prize and CTA */}
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 text-center">
          {drive.prizeDescription && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-foreground">Prize</h3>
              </div>
              <p className="text-muted-foreground whitespace-pre-line">{drive.prizeDescription}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Purchase a Grapevine subscription and submit your confirmation to help your district win!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <SubmitConfirmationDialog />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
