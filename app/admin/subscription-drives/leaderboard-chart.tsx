"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import type { DriveLeaderboardEntry } from "./actions"

interface LeaderboardChartProps {
  leaderboard: DriveLeaderboardEntry[]
}

export function LeaderboardChart({ leaderboard }: LeaderboardChartProps) {
  // Prepare chart data - show top 10 districts
  const chartData = leaderboard.slice(0, 10).map((entry) => ({
    district: `District ${entry.district}`,
    approved: entry.approved,
    pending: entry.pending,
  }))

  const chartConfig = {
    approved: {
      label: "Approved",
      theme: {
        light: "oklch(0.45 0.15 240)",
        dark: "oklch(0.6 0.15 240)",
      },
    },
    pending: {
      label: "Pending",
      theme: {
        light: "oklch(0.45 0.15 240 / 0.4)",
        dark: "oklch(0.6 0.15 240 / 0.4)",
      },
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>District Leaderboard</CardTitle>
        <CardDescription>Top districts by subscription count (approved + pending)</CardDescription>
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
  )
}
