"use client"

import { Calendar, FolderOpen, Server, Github, Activity, AlertTriangle, FileText, ExternalLink, Lock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { ReportData, EventSummary, DriveDelta, DriveFile } from "./types"
import { isLegacyEventData } from "./types"

interface ReportContentProps {
  data: ReportData
  month: string
  generatedAt: string
  showAllStatuses?: boolean // true for admin page, false for public page
}

function formatMonthName(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatEventDate(date: string, endDate: string | null): string {
  const start = new Date(date + "T00:00:00")
  const formatted = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (endDate && endDate !== date) {
    const end = new Date(endDate + "T00:00:00")
    return `${formatted} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }
  return formatted
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a"
  return value.toLocaleString("en-US")
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-primary/10 px-4 py-3 text-center min-w-[100px]">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function QuickStats({ data }: { data: ReportData }) {
  const eventsCount = isLegacyEventData(data.events)
    ? data.events.created
    : data.events.summary.createdCount

  const totalFiles = data.drive.reduce((acc, d) => acc + d.created.length + d.modified.length, 0)
  const avgUptime = data.uptime.length
    ? data.uptime.reduce((acc, u) => acc + u.uptimePercent, 0) / data.uptime.length
    : 100

  return (
    <div className="flex flex-wrap gap-3">
      <StatBadge label="Events" value={eventsCount} />
      <StatBadge label="Files" value={totalFiles} />
      <StatBadge label="Uptime" value={`${avgUptime.toFixed(1)}%`} />
    </div>
  )
}

function EventDetails({ event, showStatus = true }: { event: EventSummary; showStatus?: boolean }) {
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex gap-2">
        <dt className="text-muted-foreground">Date:</dt>
        <dd>{formatEventDate(event.date, event.endDate)}</dd>
      </div>
      {event.startTime && (
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Time:</dt>
          <dd>
            {event.startTime}
            {event.endTime ? ` - ${event.endTime}` : ""}
          </dd>
        </div>
      )}
      <div className="flex gap-2">
        <dt className="text-muted-foreground">Location:</dt>
        <dd className="capitalize">
          {event.locationType}
          {event.address ? `: ${event.address}` : ""}
        </dd>
      </div>
      {showStatus && (
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Status:</dt>
          <dd>
            <Badge
              variant={event.status === "approved" ? "default" : event.status === "pending" ? "secondary" : "destructive"}
            >
              {event.status}
            </Badge>
          </dd>
        </div>
      )}
      {event.types.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.types.map((type) => (
            <Badge key={type} variant="outline">
              {type}
            </Badge>
          ))}
        </div>
      )}
    </dl>
  )
}

function EventsSection({ events, showAllStatuses = false }: { events: ReportData["events"]; showAllStatuses?: boolean }) {
  if (isLegacyEventData(events)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-2">Events created: {events.created}</p>
          <p className="text-muted-foreground mb-4">Events updated: {events.updated}</p>
          <p className="text-sm text-muted-foreground italic">
            Detailed event names are not available for reports generated before this feature was added.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Filter to only approved events on public page
  const filteredCreated = showAllStatuses
    ? events.created
    : events.created.filter((e) => e.status === "approved")
  const filteredUpdated = showAllStatuses
    ? events.updated
    : events.updated.filter((e) => e.status === "approved")

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            New Events
            <Badge variant="secondary">{filteredCreated.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCreated.length === 0 ? (
            <p className="text-muted-foreground">No events created this month.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredCreated.map((event) => (
                <AccordionItem key={event.id} value={event.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.title}</span>
                      {showAllStatuses && (
                        <Badge
                          variant={
                            event.status === "approved"
                              ? "default"
                              : event.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <EventDetails event={event} showStatus={showAllStatuses} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Updated Events
            <Badge variant="secondary">{filteredUpdated.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUpdated.length === 0 ? (
            <p className="text-muted-foreground">No events updated this month.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredUpdated.map((event) => (
                <AccordionItem key={event.id} value={event.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.title}</span>
                      {showAllStatuses && (
                        <Badge
                          variant={
                            event.status === "approved"
                              ? "default"
                              : event.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <EventDetails event={event} showStatus={showAllStatuses} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FileItem({ file }: { file: DriveFile }) {
  // Show displayName if available, otherwise path, otherwise name
  const displayText = file.displayName || file.path || file.name
  
  return (
    <li className="flex items-center gap-2 text-sm py-1">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate">{displayText}</span>
      {file.isLocked && (
        <Lock className="h-3 w-3 text-yellow-600 shrink-0" aria-label="Password protected" />
      )}
      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline shrink-0"
          aria-label={`Open ${displayText} in Google Drive`}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </li>
  )
}

function DriveSection({ drive }: { drive: DriveDelta[] }) {
  return (
    <div className="grid gap-6">
      {drive.map((folder) => (
        <Card key={folder.folderName}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {folder.folderName}
              {folder.error ? (
                <Badge variant="destructive">Error</Badge>
              ) : (
                <>
                  <Badge variant="secondary">{folder.created.length} new</Badge>
                  <Badge variant="outline">{folder.modified.length} updated</Badge>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {folder.error ? (
              <p className="text-destructive">{folder.error}</p>
            ) : folder.created.length === 0 && folder.modified.length === 0 ? (
              <p className="text-muted-foreground">No changes this month.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {folder.created.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">New Files</h4>
                    <ul className="space-y-1">
                      {folder.created.map((file) => (
                        <FileItem key={file.id} file={file} />
                      ))}
                    </ul>
                  </div>
                )}
                {folder.modified.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">Modified Files</h4>
                    <ul className="space-y-1">
                      {folder.modified.map((file) => (
                        <FileItem key={file.id} file={file} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function InfrastructureSection({ cloudflare }: { cloudflare: ReportData["cloudflare"] }) {
  const metrics = [
    {
      label: "Workers",
      value: cloudflare.workers.error
        ? cloudflare.workers.error
        : `${formatNumber(cloudflare.workers.requests)} requests, ${formatNumber(cloudflare.workers.subrequests)} subrequests, ${formatNumber(cloudflare.workers.errors)} errors`,
      hasError: !!cloudflare.workers.error,
    },
    {
      label: "CPU Time",
      value: cloudflare.workers.error
        ? "n/a"
        : `P50: ${formatNumber(cloudflare.workers.cpuTimeP50)}μs, P99: ${formatNumber(cloudflare.workers.cpuTimeP99)}μs`,
      hasError: false,
    },
    {
      label: "Duration",
      value: cloudflare.workers.error
        ? "n/a"
        : `P50: ${formatNumber(cloudflare.workers.durationP50)}ms, P99: ${formatNumber(cloudflare.workers.durationP99)}ms`,
      hasError: false,
    },
    {
      label: "D1 Database",
      value: cloudflare.d1.error
        ? cloudflare.d1.error
        : `${formatNumber(cloudflare.d1.readQueries)} reads, ${formatNumber(cloudflare.d1.writeQueries)} writes`,
      hasError: !!cloudflare.d1.error,
    },
    {
      label: "R2 Storage",
      value: cloudflare.r2.error ? cloudflare.r2.error : `${formatNumber(cloudflare.r2.requests)} requests`,
      hasError: !!cloudflare.r2.error,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Cloudflare Infrastructure
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
              <div className={`mt-1 ${metric.hasError ? "text-destructive" : "text-foreground"}`}>{metric.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GitHubSection({ github }: { github: ReportData["github"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {github.error ? (
          <p className="text-destructive">Error: {github.error}</p>
        ) : github.commits.totalCount === 0 ? (
          <p className="text-muted-foreground">No commits this month.</p>
        ) : (
          <div>
            <p className="text-green-600 font-semibold mb-4">
              {github.commits.totalCount} commit{github.commits.totalCount > 1 ? "s" : ""} (deployments)
            </p>
            {github.commits.sample.length > 0 && (
              <ul className="space-y-3">
                {github.commits.sample.map((commit) => (
                  <li key={commit.sha} className="border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {commit.sha.slice(0, 7)}
                      </span>
                      <span className="font-medium text-sm">{commit.commit.message.split("\n")[0]}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {commit.commit.author.name} - {new Date(commit.commit.author.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {github.commits.totalCount > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                ... and {github.commits.totalCount - 5} more commits
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UptimeSection({ uptime }: { uptime: ReportData["uptime"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Uptime Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uptime.length === 0 ? (
          <p className="text-muted-foreground">No uptime data recorded this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Endpoint</th>
                  <th className="text-right py-2 font-medium">Checks</th>
                  <th className="text-right py-2 font-medium">Uptime</th>
                  <th className="text-right py-2 font-medium">Avg Latency</th>
                  <th className="text-right py-2 font-medium">Max Latency</th>
                </tr>
              </thead>
              <tbody>
                {uptime.map((row) => (
                  <tr key={row.endpoint} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{row.endpoint}</td>
                    <td className="py-2 text-right text-muted-foreground">{row.checksTotal}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        row.uptimePercent >= 99
                          ? "text-green-600"
                          : row.uptimePercent >= 95
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {row.uptimePercent.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-muted-foreground">{Math.round(row.avgLatencyMs)}ms</td>
                    <td className="py-2 text-right text-muted-foreground">{row.maxLatencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ErrorsSection({ errors }: { errors: ReportData["errors"] }) {
  const totalErrors = errors.byKind.reduce((acc, row) => acc + row.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Errors
          {totalErrors === 0 ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              None
            </Badge>
          ) : (
            <Badge variant="destructive">{totalErrors}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.byKind.length === 0 ? (
          <p className="text-green-600 font-medium">No errors recorded this month.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">By Type</h4>
              <ul className="space-y-2">
                {errors.byKind.map((row) => (
                  <li key={row.errorKind} className="flex justify-between items-center">
                    <span className="text-sm">{row.errorKind}</span>
                    <Badge variant="outline">{row.count}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            {errors.topErrors.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Top Errors</h4>
                <ul className="space-y-3">
                  {errors.topErrors.slice(0, 5).map((row, idx) => (
                    <li key={idx} className="border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {row.count}x
                        </Badge>
                        <span className="text-sm font-medium">{row.errorKind}</span>
                      </div>
                      {row.sampleRoute && (
                        <div className="text-xs text-muted-foreground mt-1">Route: {row.sampleRoute}</div>
                      )}
                      {row.sampleMessage && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">{row.sampleMessage}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReportContent({ data, month, generatedAt, showAllStatuses = false }: ReportContentProps) {
  const monthName = formatMonthName(month)

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground sm:text-5xl">{monthName} Report</h1>
              <p className="mt-2 text-muted-foreground">
                Generated{" "}
                {new Date(generatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <QuickStats data={data} />
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="events" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
              <TabsTrigger value="events" className="flex items-center gap-2 py-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="drive" className="flex items-center gap-2 py-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Drive</span>
              </TabsTrigger>
              <TabsTrigger value="infrastructure" className="flex items-center gap-2 py-2">
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">Infra</span>
              </TabsTrigger>
              <TabsTrigger value="github" className="flex items-center gap-2 py-2">
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </TabsTrigger>
              <TabsTrigger value="uptime" className="flex items-center gap-2 py-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Uptime</span>
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-2 py-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Errors</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              <EventsSection events={data.events} showAllStatuses={showAllStatuses} />
            </TabsContent>

            <TabsContent value="drive">
              <DriveSection drive={data.drive} />
            </TabsContent>

            <TabsContent value="infrastructure">
              <InfrastructureSection cloudflare={data.cloudflare} />
            </TabsContent>

            <TabsContent value="github">
              <GitHubSection github={data.github} />
            </TabsContent>

            <TabsContent value="uptime">
              <UptimeSection uptime={data.uptime} />
            </TabsContent>

            <TabsContent value="errors">
              <ErrorsSection errors={data.errors} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  )
}
