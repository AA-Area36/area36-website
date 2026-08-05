import { getGmailCredentials, sendEmail } from "../../../lib/gmail/client"
import { getAccessToken } from "../../../lib/gdrive/auth"

interface Env {
  DB: D1Database
  REPORTS_BUCKET: R2Bucket
  GDRIVE_SERVICE_ACCOUNT_EMAIL?: string
  GDRIVE_PRIVATE_KEY?: string
  GDRIVE_PRIVATE_KEY_ID?: string
  GMAIL_SENDER_EMAIL?: string
  GITHUB_TOKEN?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  SITE_BASE_URL?: string
  GDRIVE_NEWSLETTERS_FOLDER_ID?: string
  GDRIVE_RESOURCES_FOLDER_ID?: string
  GDRIVE_RECORDINGS_FOLDER_ID?: string
  GDRIVE_COMMITTEES_FOLDER_ID?: string
  GDRIVE_SERVICE_RESOURCES_FOLDER_ID?: string
  TRIGGER_SECRET?: string
}

const REPORT_RECIPIENT = "webmaster@area36.org"
const GITHUB_REPO = "AA-Area36/area36-website"

interface GitHubCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  createdTime: string
  modifiedTime: string
  webViewLink?: string
  path?: string // e.g., "Committee Name/file.pdf"
  displayName?: string // from fileMetadata table
  isLocked?: boolean // true if file has password protection
}

interface DriveDelta {
  folderName: string
  created: DriveFile[]
  modified: DriveFile[]
  error?: string
}

interface EventSummary {
  id: string
  title: string
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  locationType: string
  address: string | null
  status: string
  types: string[]
  isRecurring: boolean
  createdAt: string
  updatedAt: string
}

interface EventDetails {
  created: EventSummary[]
  updated: EventSummary[]
  summary: {
    createdCount: number
    updatedCount: number
  }
}

interface WorkerErrorBreakdown {
  scriptThrewException: number
  exceededResources: number
  internalError: number
  clientDisconnected: number
}

interface FlattenedCloudflare {
  workers: {
    requests: number | null
    subrequests: number | null
    errors: number | null
    cpuTimeP50: number | null
    cpuTimeP99: number | null
    durationP50: number | null
    durationP99: number | null
    errorBreakdown?: WorkerErrorBreakdown
    error?: string
  }
  d1: {
    readQueries: number | null
    writeQueries: number | null
    rowsRead: number | null
    rowsWritten: number | null
    error?: string
  }
  r2: {
    requests: number | null
    error?: string
  }
}

interface CloudflareMetricResult<T> {
  data?: T
  error?: string
}

type CloudflareMetrics = Awaited<ReturnType<typeof fetchCloudflareMetrics>>

function getPreviousMonthRange(now = new Date()) {
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const firstOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const monthKey = firstOfPrevMonth.toISOString().slice(0, 7)
  return {
    start: firstOfPrevMonth,
    end: firstOfThisMonth,
    monthKey,
  }
}

// For testing: get current month range (month-to-date)
function getCurrentMonthRange(now = new Date()) {
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const monthKey = firstOfThisMonth.toISOString().slice(0, 7)
  return {
    start: firstOfThisMonth,
    end: tomorrow,
    monthKey,
  }
}

function formatSqliteDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ")
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatNumber(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("en-US")
  }
  return "n/a"
}

function parseLinkHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const links: Record<string, string> = {}
  const parts = header.split(",")
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel=\"([^\"]+)\"/)
    if (match) {
      links[match[2]] = match[1]
    }
  }
  return links
}

async function fetchGitHubCommits(token: string | undefined, start: Date, end: Date) {
  const baseUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits`
  const params = new URLSearchParams({
    since: start.toISOString(),
    until: end.toISOString(),
    per_page: "100",
  })

  const allCommits: GitHubCommit[] = []
  let url: string | null = `${baseUrl}?${params.toString()}`

  // Paginate through all commits
  while (url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "area36-monthly-report",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`GitHub API error ${response.status}: ${text}`)
    }

    const pageCommits = (await response.json()) as GitHubCommit[]
    allCommits.push(...pageCommits)

    // Check for next page
    const links = parseLinkHeader(response.headers.get("Link"))
    url = links.next || null
  }

  return {
    totalCount: allCommits.length,
    sample: allCommits.slice(0, 5),  // For email (truncated)
    all: allCommits,  // For web (all commits)
  }
}

async function fetchCloudflareQuery<T>(
  token: string | undefined,
  accountId: string | undefined,
  query: string,
  variables: Record<string, unknown>
): Promise<CloudflareMetricResult<T>> {
  if (!token || !accountId) {
    return { error: "Cloudflare API token or account ID not configured" }
  }

  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables: { accountTag: accountId, ...variables } }),
  })

  if (!response.ok) {
    const text = await response.text()
    return { error: `Cloudflare GraphQL error ${response.status}: ${text}` }
  }

  const payload = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (payload.errors && payload.errors.length > 0) {
    return { error: payload.errors.map((err) => err.message).join("; ") }
  }

  if (!payload.data) {
    return { error: "Cloudflare GraphQL returned no data" }
  }

  return { data: payload.data }
}

async function fetchCloudflareMetrics(token: string | undefined, accountId: string | undefined, start: Date, end: Date) {
  const endInclusive = new Date(end.getTime() - 1)
  const variables = {
    since: start.toISOString(),
    until: endInclusive.toISOString(),
    dateSince: start.toISOString().slice(0, 10),
    dateUntil: endInclusive.toISOString().slice(0, 10),
  }

  // Workers query - use quantiles for CPU time and duration (not available in sum)
  const workersQuery = `query($accountTag: String!, $since: DateTime!, $until: DateTime!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(limit: 10000, filter: { datetime_geq: $since, datetime_leq: $until }) {
          sum {
            requests
            subrequests
            errors
          }
          quantiles {
            cpuTimeP50
            cpuTimeP99
            durationP50
            durationP99
          }
        }
      }
    }
  }`

  // D1 query - basic sum fields only (time metrics use quantiles but not critical)
  const d1Query = `query($accountTag: String!, $dateSince: Date!, $dateUntil: Date!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        d1AnalyticsAdaptiveGroups(limit: 10000, filter: { date_geq: $dateSince, date_leq: $dateUntil }) {
          sum {
            readQueries
            writeQueries
            rowsRead
            rowsWritten
          }
        }
      }
    }
  }`

  // R2 query - requests only
  const r2Query = `query($accountTag: String!, $since: Time!, $until: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        r2OperationsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $since, datetime_leq: $until }) {
          sum {
            requests
          }
        }
      }
    }
  }`

  // Worker error breakdown by status - groups by invocation outcome
  const errorBreakdownQuery = `query($accountTag: String!, $since: DateTime!, $until: DateTime!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(limit: 10000, filter: { datetime_geq: $since, datetime_leq: $until }) {
          sum {
            requests
          }
          dimensions {
            status
          }
        }
      }
    }
  }`

  // Note: Pages Functions use the same Workers runtime and are tracked with workersInvocationsAdaptive
  // There is no separate pagesFunctionsInvocationsAdaptive node

  const [workers, d1, r2, errorBreakdown] = await Promise.all([
    fetchCloudflareQuery(token, accountId, workersQuery, variables),
    fetchCloudflareQuery(token, accountId, d1Query, variables),
    fetchCloudflareQuery(token, accountId, r2Query, variables),
    fetchCloudflareQuery(token, accountId, errorBreakdownQuery, variables),
  ])

  return { workers, d1, r2, errorBreakdown }
}

const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

async function listDriveFilesRecursive(
  accessToken: string,
  folderId: string,
  start: Date,
  end: Date,
  parentPath: string = ""
): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const fields = "files(id,name,mimeType,createdTime,modifiedTime,webViewLink),nextPageToken"
  // Get all items (files AND folders) that were modified in the period, plus all folders (to recurse into)
  const q = `'${folderId}' in parents and trashed = false and (modifiedTime >= '${startIso}' and modifiedTime < '${endIso}' or mimeType = '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}')`

  do {
    const params = new URLSearchParams({
      q,
      fields,
      pageSize: "100",
    })
    if (pageToken) {
      params.set("pageToken", pageToken)
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Drive API error ${response.status}: ${text}`)
    }

    const payload = (await response.json()) as { files: DriveFile[]; nextPageToken?: string }
    
    for (const item of payload.files) {
      if (item.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        // Recursively get files from subfolder
        const subPath = parentPath ? `${parentPath}/${item.name}` : item.name
        const subFiles = await listDriveFilesRecursive(accessToken, item.id, start, end, subPath)
        allFiles.push(...subFiles)
      } else {
        // It's a file - check if it was actually modified in the period
        const modifiedTime = Date.parse(item.modifiedTime)
        if (modifiedTime >= start.getTime() && modifiedTime < end.getTime()) {
          allFiles.push({
            ...item,
            path: parentPath ? `${parentPath}/${item.name}` : item.name,
          })
        }
      }
    }
    
    pageToken = payload.nextPageToken
  } while (pageToken)

  return allFiles
}

async function fetchDriveFilesWithMetadata(
  env: Env,
  folderId: string,
  start: Date,
  end: Date
): Promise<DriveFile[]> {
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_PRIVATE_KEY || !env.GDRIVE_PRIVATE_KEY_ID) {
    throw new Error("Google Drive credentials are not configured")
  }

  const credentials = {
    clientEmail: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GDRIVE_PRIVATE_KEY,
    privateKeyId: env.GDRIVE_PRIVATE_KEY_ID,
  }

  const accessToken = await getAccessToken(credentials)
  
  // Get all files recursively with paths
  const files = await listDriveFilesRecursive(accessToken, folderId, start, end)
  
  if (files.length === 0) {
    return files
  }
  
  // Fetch metadata for these files from the database
  const fileIds = files.map(f => f.id)
  const placeholders = fileIds.map(() => "?").join(",")
  
  interface FileMetaRow {
    drive_id: string
    display_name: string
    is_locked: number
  }
  
  const metadata = await env.DB.prepare(`
    SELECT drive_id, display_name, password IS NOT NULL as is_locked
    FROM file_metadata
    WHERE drive_id IN (${placeholders})
  `).bind(...fileIds).all<FileMetaRow>()
  
  // Create a lookup map
  const metaMap = new Map(metadata.results.map(m => [m.drive_id, m]))
  
  // Enrich files with metadata
  for (const file of files) {
    const meta = metaMap.get(file.id)
    if (meta) {
      file.displayName = meta.display_name
      file.isLocked = Boolean(meta.is_locked)
    }
  }
  
  return files
}

async function fetchDriveDeltas(env: Env, start: Date, end: Date): Promise<DriveDelta[]> {
  const folders: { name: string; id?: string }[] = [
    { name: "Newsletters", id: env.GDRIVE_NEWSLETTERS_FOLDER_ID },
    { name: "Recordings", id: env.GDRIVE_RECORDINGS_FOLDER_ID },
    { name: "Committees", id: env.GDRIVE_COMMITTEES_FOLDER_ID },
    { name: "Resources", id: env.GDRIVE_RESOURCES_FOLDER_ID },
    { name: "Service Resources", id: env.GDRIVE_SERVICE_RESOURCES_FOLDER_ID },
  ]

  const deltas: DriveDelta[] = []
  for (const folder of folders) {
    if (!folder.id) {
      deltas.push({
        folderName: folder.name,
        created: [],
        modified: [],
        error: "Folder ID not configured",
      })
      continue
    }

    try {
      // Recursively fetch files with paths and metadata
      const files = await fetchDriveFilesWithMetadata(env, folder.id, start, end)
      const created: DriveFile[] = []
      const modified: DriveFile[] = []

      for (const file of files) {
        const createdTime = Date.parse(file.createdTime)
        const modifiedTime = Date.parse(file.modifiedTime)
        if (createdTime >= start.getTime() && createdTime < end.getTime()) {
          created.push(file)
        } else if (modifiedTime >= start.getTime() && modifiedTime < end.getTime()) {
          modified.push(file)
        }
      }

      deltas.push({ folderName: folder.name, created, modified })
    } catch (error) {
      deltas.push({
        folderName: folder.name,
        created: [],
        modified: [],
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return deltas
}

export async function fetchEventDetails(
  env: Pick<Env, "DB">,
  start: Date,
  end: Date
): Promise<EventDetails> {
  const startSql = formatSqliteDate(start)
  const endSql = formatSqliteDate(end)

  interface EventRow {
    id: string
    title: string
    date: string
    endDate: string | null
    startTime: string | null
    endTime: string | null
    locationType: string
    address: string | null
    status: string
    isRecurring: number
    createdAt: string
    updatedAt: string
    types: string | null
  }

  const mapEvent = (row: EventRow): EventSummary => ({
    id: row.id,
    title: row.title,
    date: row.date,
    endDate: row.endDate,
    startTime: row.startTime,
    endTime: row.endTime,
    locationType: row.locationType,
    address: row.address,
    status: row.status,
    types: row.types ? row.types.split(",") : [],
    isRecurring: Boolean(row.isRecurring),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })

  // Fetch events created in this period with their types
  const createdEvents = await env.DB.prepare(`
    SELECT 
      e.id, e.title, e.date, e.end_date as endDate,
      e.start_time as startTime, e.end_time as endTime,
      e.location_type as locationType, e.address,
      e.status, e.is_recurring as isRecurring,
      e.created_at as createdAt, e.updated_at as updatedAt,
      GROUP_CONCAT(et.type) as types
    FROM events e
    LEFT JOIN event_to_types et ON e.id = et.event_id
    WHERE e.created_at >= ? AND e.created_at < ?
      AND e.status = 'approved'
    GROUP BY e.id
    ORDER BY e.date ASC
  `)
    .bind(startSql, endSql)
    .all<EventRow>()

  // Fetch events updated (but not created) in this period
  const updatedEvents = await env.DB.prepare(`
    SELECT 
      e.id, e.title, e.date, e.end_date as endDate,
      e.start_time as startTime, e.end_time as endTime,
      e.location_type as locationType, e.address,
      e.status, e.is_recurring as isRecurring,
      e.created_at as createdAt, e.updated_at as updatedAt,
      GROUP_CONCAT(et.type) as types
    FROM events e
    LEFT JOIN event_to_types et ON e.id = et.event_id
    WHERE e.updated_at >= ? AND e.updated_at < ?
      AND e.created_at < ?
      AND e.status = 'approved'
    GROUP BY e.id
    ORDER BY e.date ASC
  `)
    .bind(startSql, endSql, startSql)
    .all<EventRow>()

  return {
    created: createdEvents.results.map(mapEvent),
    updated: updatedEvents.results.map(mapEvent),
    summary: {
      createdCount: createdEvents.results.length,
      updatedCount: updatedEvents.results.length,
    },
  }
}

function flattenCloudflareMetrics(cloudflare: CloudflareMetrics): FlattenedCloudflare {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getData = (data: any, path: string[]) => {
    try {
      let val = data
      for (const key of path) val = val?.[key]
      return val?.[0] ?? {}
    } catch {
      return {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDataArray = (data: any, path: string[]) => {
    try {
      let val = data
      for (const key of path) val = val?.[key]
      return val ?? []
    } catch {
      return []
    }
  }

  const workersData = getData(cloudflare.workers.data, ["viewer", "accounts", "0", "workersInvocationsAdaptive"])
  const workersSum = workersData.sum ?? {}
  const workersQuantiles = workersData.quantiles ?? {}
  
  const d1Data = getData(cloudflare.d1.data, ["viewer", "accounts", "0", "d1AnalyticsAdaptiveGroups"])
  const d1Sum = d1Data.sum ?? {}
  
  const r2Data = getData(cloudflare.r2.data, ["viewer", "accounts", "0", "r2OperationsAdaptiveGroups"])
  const r2Sum = r2Data.sum ?? {}

  // Parse error breakdown from status dimensions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorBreakdownData = getDataArray(cloudflare.errorBreakdown?.data, ["viewer", "accounts", "0", "workersInvocationsAdaptive"]) as any[]
  let errorBreakdown: WorkerErrorBreakdown | undefined
  
  if (errorBreakdownData.length > 0) {
    errorBreakdown = {
      scriptThrewException: 0,
      exceededResources: 0,
      internalError: 0,
      clientDisconnected: 0,
    }
    
    for (const item of errorBreakdownData) {
      const status = item.dimensions?.status
      const count = item.sum?.requests ?? 0
      
      if (status === "scriptThrewException") {
        errorBreakdown.scriptThrewException = count
      } else if (status === "exceededResources") {
        errorBreakdown.exceededResources = count
      } else if (status === "internalError") {
        errorBreakdown.internalError = count
      } else if (status === "clientDisconnected") {
        errorBreakdown.clientDisconnected = count
      }
    }
    
    // Only include if there are actual errors
    const totalErrors = errorBreakdown.scriptThrewException + 
      errorBreakdown.exceededResources + 
      errorBreakdown.internalError + 
      errorBreakdown.clientDisconnected
    if (totalErrors === 0) {
      errorBreakdown = undefined
    }
  }

  return {
    workers: {
      requests: workersSum.requests ?? null,
      subrequests: workersSum.subrequests ?? null,
      errors: workersSum.errors ?? null,
      cpuTimeP50: workersQuantiles.cpuTimeP50 ?? null,
      cpuTimeP99: workersQuantiles.cpuTimeP99 ?? null,
      durationP50: workersQuantiles.durationP50 ?? null,
      durationP99: workersQuantiles.durationP99 ?? null,
      errorBreakdown,
      error: cloudflare.workers.error,
    },
    d1: {
      readQueries: d1Sum.readQueries ?? null,
      writeQueries: d1Sum.writeQueries ?? null,
      rowsRead: d1Sum.rowsRead ?? null,
      rowsWritten: d1Sum.rowsWritten ?? null,
      error: cloudflare.d1.error,
    },
    r2: {
      requests: r2Sum.requests ?? null,
      error: cloudflare.r2.error,
    },
  }
}

async function fetchUptimeSummary(env: Env, start: Date, end: Date) {
  const startDay = start.toISOString().slice(0, 10)
  const endDay = end.toISOString().slice(0, 10)

  const rows = await env.DB.prepare(
    `SELECT endpoint,
      SUM(checks_total) as checks_total,
      SUM(checks_ok) as checks_ok,
      SUM(latency_ms_sum) as latency_ms_sum,
      MAX(latency_ms_max) as latency_ms_max
     FROM uptime_daily
     WHERE day >= ? AND day < ?
     GROUP BY endpoint
     ORDER BY endpoint ASC`
  )
    .bind(startDay, endDay)
    .all<{
      endpoint: string
      checks_total: number
      checks_ok: number
      latency_ms_sum: number
      latency_ms_max: number
    }>()

  return rows.results.map((row) => {
    const avgLatency = row.checks_total > 0 ? row.latency_ms_sum / row.checks_total : 0
    const uptimePercent = row.checks_total > 0 ? (row.checks_ok / row.checks_total) * 100 : 0
    return {
      endpoint: row.endpoint,
      checksTotal: row.checks_total,
      checksOk: row.checks_ok,
      uptimePercent,
      avgLatencyMs: avgLatency,
      maxLatencyMs: row.latency_ms_max,
    }
  })
}

async function fetchErrorSummary(env: Env, start: Date, end: Date) {
  const startDay = start.toISOString().slice(0, 10)
  const endDay = end.toISOString().slice(0, 10)

  const byKind = await env.DB.prepare(
    `SELECT error_kind as errorKind, SUM(count) as count
     FROM errors_daily
     WHERE day >= ? AND day < ?
     GROUP BY error_kind
     ORDER BY count DESC`
  )
    .bind(startDay, endDay)
    .all<{ errorKind: string; count: number }>()

  const topErrors = await env.DB.prepare(
    `SELECT error_kind as errorKind, fingerprint, count, sample_message as sampleMessage, sample_route as sampleRoute
     FROM errors_daily
     WHERE day >= ? AND day < ?
     ORDER BY count DESC
     LIMIT 10`
  )
    .bind(startDay, endDay)
    .all<{
      errorKind: string
      fingerprint: string
      count: number
      sampleMessage: string | null
      sampleRoute: string | null
    }>()

  return {
    byKind: byKind.results,
    topErrors: topErrors.results,
  }
}

interface ReportData {
  monthKey: string
  generatedAt: string
  events: EventDetails
  drive: DriveDelta[]
  cloudflare: FlattenedCloudflare
  github: {
    commits: { 
      totalCount: number
      sample: GitHubCommit[]  // For email (5 commits)
      all?: GitHubCommit[]    // For web (all commits)
    }
    error?: string
  }
  uptime: Awaited<ReturnType<typeof fetchUptimeSummary>>
  errors: Awaited<ReturnType<typeof fetchErrorSummary>>
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

function formatMonthName(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderCommitAuthor(authorName: string, authorDate: string): string {
  const date = new Date(authorDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${escapeHtml(authorName)} - ${date}`
}

function renderHtmlReport(data: ReportData) {
  const { monthKey, github, cloudflare, events, drive, uptime, errors, generatedAt } = data
  const monthName = formatMonthName(monthKey)
  
  // Calculate quick stats
  const totalFilesChanged = drive.reduce((acc, d) => acc + d.created.length + d.modified.length, 0)
  const avgUptime = uptime.length
    ? uptime.reduce((acc, u) => acc + u.uptimePercent, 0) / uptime.length
    : 100

  // Events section - render actual event names
  const renderEventList = (eventList: EventSummary[], label: string) => {
    if (eventList.length === 0) {
      return `<p style="color: #6b7280; margin: 8px 0;">No events ${label.toLowerCase()} this month.</p>`
    }
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
        ${eventList
          .map(
            (event) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 600; color: #111827;">${escapeHtml(event.title)}</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">
                ${formatEventDate(event.date, event.endDate)}
                ${event.startTime ? ` at ${event.startTime}` : ""}
                ${event.locationType !== "online" && event.address ? ` - ${escapeHtml(event.address)}` : ""}
              </div>
              ${event.types.length > 0 ? `<div style="font-size: 12px; color: #1e40af; margin-top: 4px;">${event.types.join(", ")}</div>` : ""}
            </td>
          </tr>
        `
          )
          .join("")}
      </table>
    `
  }

  // Drive section - render actual file names
  const renderDriveFolder = (delta: DriveDelta) => {
    if (delta.error) {
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827;">${escapeHtml(delta.folderName)}</div>
            <div style="font-size: 13px; color: #dc2626; margin-top: 4px;">Error: ${escapeHtml(delta.error)}</div>
          </td>
        </tr>
      `
    }
    
    const hasChanges = delta.created.length > 0 || delta.modified.length > 0
    if (!hasChanges) {
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827;">${escapeHtml(delta.folderName)}</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">No changes this month</div>
          </td>
        </tr>
      `
    }

    const fileList = (files: DriveFile[], label: string) => {
      if (files.length === 0) return ""
      return `
        <div style="margin-top: 8px;">
          <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">${label}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${files.map((f) => {
              const displayText = f.displayName || f.path || f.name
              const lockIcon = f.isLocked ? ' <span style="color: #ca8a04;">&#128274;</span>' : ''
              return `
                <tr>
                  <td style="padding: 4px 0; padding-left: 12px;">
                    <span style="color: #6b7280; margin-right: 8px;">&#8226;</span>
                    <span style="font-size: 13px; color: #374151;">${escapeHtml(displayText)}${lockIcon}</span>
                  </td>
                </tr>
              `
            }).join("")}
          </table>
        </div>
      `
    }

    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${escapeHtml(delta.folderName)}</div>
          <div style="font-size: 13px; color: #16a34a; margin-top: 2px;">
            ${delta.created.length} new, ${delta.modified.length} updated
          </div>
          ${fileList(delta.created, "New Files")}
          ${fileList(delta.modified, "Modified Files")}
        </td>
      </tr>
    `
  }

  // Cloudflare section - Structured layout for email
  const infrastructureContent = cloudflare.workers.error
    ? `<p style="color: #dc2626;">Error: ${escapeHtml(cloudflare.workers.error)}</p>`
    : `
      <!-- Workers Summary -->
      <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 12px;">Workers</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #111827;">${formatNumber(cloudflare.workers.requests)}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Requests</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #111827;">${formatNumber(cloudflare.workers.subrequests)}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Subrequests</div>
            </td>
            <td style="text-align: center; padding: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #111827;">${formatNumber(cloudflare.workers.errors)}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Errors</div>
            </td>
          </tr>
        </table>
        <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 4px 8px;">
                <span style="font-size: 12px; color: #6b7280;">CPU Time:</span>
                <span style="font-size: 13px; color: #374151; margin-left: 8px;">P50: ${formatNumber(cloudflare.workers.cpuTimeP50)}μs</span>
                <span style="font-size: 13px; color: #374151; margin-left: 16px;">P99: ${formatNumber(cloudflare.workers.cpuTimeP99)}μs</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 8px;">
                <span style="font-size: 12px; color: #6b7280;">Duration:</span>
                <span style="font-size: 13px; color: #374151; margin-left: 8px;">P50: ${formatNumber(cloudflare.workers.durationP50)}ms</span>
                <span style="font-size: 13px; color: #374151; margin-left: 16px;">P99: ${formatNumber(cloudflare.workers.durationP99)}ms</span>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <!-- D1 & R2 -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding-right: 8px; vertical-align: top;">
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">D1 Database</div>
              ${cloudflare.d1.error
                ? `<div style="color: #dc2626;">${escapeHtml(cloudflare.d1.error)}</div>`
                : `<div style="font-size: 18px; font-weight: bold; color: #111827;">${formatNumber(cloudflare.d1.readQueries)} <span style="font-size: 12px; font-weight: normal; color: #6b7280;">reads</span></div>
                   <div style="font-size: 18px; font-weight: bold; color: #111827;">${formatNumber(cloudflare.d1.writeQueries)} <span style="font-size: 12px; font-weight: normal; color: #6b7280;">writes</span></div>`
              }
            </div>
          </td>
          <td width="50%" style="padding-left: 8px; vertical-align: top;">
            <div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">R2 Storage</div>
              ${cloudflare.r2.error
                ? `<div style="color: #dc2626;">${escapeHtml(cloudflare.r2.error)}</div>`
                : `<div style="font-size: 18px; font-weight: bold; color: #111827;">${formatNumber(cloudflare.r2.requests)} <span style="font-size: 12px; font-weight: normal; color: #6b7280;">requests</span></div>`
              }
            </div>
          </td>
        </tr>
      </table>
    `

  // GitHub section - all commits to main are releases
  const githubContent = github.error
    ? `<p style="color: #dc2626;">Error: ${escapeHtml(github.error)}</p>`
    : github.commits.totalCount === 0
      ? `<p style="color: #6b7280;">No commits this month.</p>`
      : `
        <p style="color: #16a34a; font-weight: 600; margin-bottom: 8px;">${github.commits.totalCount} commit${github.commits.totalCount > 1 ? "s" : ""} (deployments)</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
          ${github.commits.sample
            .map(
              (c) => `
            <tr>
              <td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #111827;">${escapeHtml(c.commit.message.split("\n")[0])}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                  ${renderCommitAuthor(c.commit.author.name, c.commit.author.date)}
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </table>
        ${github.commits.totalCount > 5 ? `<p style="font-size: 12px; color: #6b7280; margin-top: 8px;">... and ${github.commits.totalCount - 5} more</p>` : ""}
      `

  // Uptime section
  const uptimeContent = uptime.length
    ? `
      <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 4px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Endpoint</th>
            <th style="text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Uptime</th>
            <th style="text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Avg Latency</th>
          </tr>
        </thead>
        <tbody>
          ${uptime
            .map(
              (row) => `
            <tr>
              <td style="color: #111827; border-bottom: 1px solid #f3f4f6;">${escapeHtml(row.endpoint)}</td>
              <td style="text-align: right; color: ${row.uptimePercent >= 99 ? "#16a34a" : row.uptimePercent >= 95 ? "#ca8a04" : "#dc2626"}; border-bottom: 1px solid #f3f4f6;">${formatPercent(row.uptimePercent)}</td>
              <td style="text-align: right; color: #6b7280; border-bottom: 1px solid #f3f4f6;">${Math.round(row.avgLatencyMs)}ms</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
    : `<p style="color: #6b7280;">No uptime data recorded this month.</p>`

  // Application Errors section (distinct from infrastructure errors)
  const errorsContent =
    errors.byKind.length === 0
      ? `<p style="color: #16a34a; font-weight: 600;">No application errors recorded this month.</p>`
      : `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">By Type</div>
          ${errors.byKind.map((row) => `<div style="padding: 2px 0; color: #374151;">${escapeHtml(row.errorKind)}: <strong>${row.count}</strong></div>`).join("")}
        </div>
        ${
          errors.topErrors.length > 0
            ? `
          <div>
            <div style="font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">Top Errors</div>
            ${errors.topErrors
              .slice(0, 5)
              .map(
                (row) => `
              <div style="padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-size: 13px; color: #dc2626;">${escapeHtml(row.errorKind)} (${row.count}x)</div>
                ${row.sampleRoute ? `<div style="font-size: 12px; color: #6b7280;">Route: ${escapeHtml(row.sampleRoute)}</div>` : ""}
                ${row.sampleMessage ? `<div style="font-size: 12px; color: #6b7280; word-break: break-word;">${escapeHtml(row.sampleMessage.slice(0, 100))}</div>` : ""}
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
      `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Area 36 Website Monthly Report - ${monthName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1e40af; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">Area 36 Website Monthly Report</h1>
              <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 14px;">${monthName}</p>
            </td>
          </tr>
          
          <!-- Quick Stats -->
          <tr>
            <td style="background-color: #eff6ff; padding: 16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${events.summary.createdCount}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Events Created</div>
                  </td>
                  <td style="text-align: center; padding: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${totalFilesChanged}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Files Changed</div>
                  </td>
                  <td style="text-align: center; padding: 8px;">
                    <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${avgUptime.toFixed(1)}%</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Avg Uptime</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Section: Events -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Events</h2>
              
              <h3 style="margin: 16px 0 8px; font-size: 14px; color: #1e40af; font-weight: 600;">New Events (${events.summary.createdCount})</h3>
              ${renderEventList(events.created, "created")}
              
              <h3 style="margin: 24px 0 8px; font-size: 14px; color: #1e40af; font-weight: 600;">Updated Events (${events.summary.updatedCount})</h3>
              ${renderEventList(events.updated, "updated")}
            </td>
          </tr>
          
          <!-- Section: Drive -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Google Drive Updates</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${drive.map(renderDriveFolder).join("")}
              </table>
            </td>
          </tr>
          
          <!-- Section: Infrastructure -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Infrastructure</h2>
              ${infrastructureContent}
            </td>
          </tr>
          
          <!-- Section: GitHub -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">GitHub Activity</h2>
              ${githubContent}
            </td>
          </tr>
          
          <!-- Section: Uptime -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Uptime</h2>
              ${uptimeContent}
            </td>
          </tr>
          
          <!-- Section: Application Errors -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Application Errors</h2>
              ${errorsContent}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Generated on ${new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}<br>
                <a href="https://area36.org/reports/${monthKey}" style="color: #1e40af; text-decoration: none;">View full report online</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function renderTextReport(data: ReportData) {
  const lines: string[] = []
  const monthName = formatMonthName(data.monthKey)
  
  lines.push(`Area 36 Website Monthly Report - ${monthName}`)
  lines.push(`Generated: ${new Date(data.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`)
  lines.push("")
  lines.push("=" .repeat(50))

  // Section 1: Events
  lines.push("")
  lines.push("EVENTS")
  lines.push("-".repeat(50))
  lines.push(`New Events: ${data.events.summary.createdCount}`)
  for (const event of data.events.created) {
    lines.push(`  - ${event.title} (${formatEventDate(event.date, event.endDate)})`)
  }
  if (data.events.created.length === 0) {
    lines.push("  No new events this month.")
  }
  lines.push("")
  lines.push(`Updated Events: ${data.events.summary.updatedCount}`)
  for (const event of data.events.updated) {
    lines.push(`  - ${event.title} (${formatEventDate(event.date, event.endDate)})`)
  }
  if (data.events.updated.length === 0) {
    lines.push("  No updated events this month.")
  }

  // Section 2: Drive - show file paths and display names
  lines.push("")
  lines.push("GOOGLE DRIVE UPDATES")
  lines.push("-".repeat(50))
  const formatDriveFile = (file: DriveFile): string => {
    const displayText = file.displayName || file.path || file.name
    const lockIndicator = file.isLocked ? " [Protected]" : ""
    return `${displayText}${lockIndicator}`
  }
  for (const delta of data.drive) {
    if (delta.error) {
      lines.push(`${delta.folderName}: Error - ${delta.error}`)
    } else {
      lines.push(`${delta.folderName}: ${delta.created.length} new, ${delta.modified.length} updated`)
      for (const file of delta.created) {
        lines.push(`  + ${formatDriveFile(file)}`)
      }
      for (const file of delta.modified) {
        lines.push(`  ~ ${formatDriveFile(file)}`)
      }
    }
  }

  // Section 3: Infrastructure
  lines.push("")
  lines.push("INFRASTRUCTURE")
  lines.push("-".repeat(50))
  lines.push(
    `Workers: ${
      data.cloudflare.workers.error
        ? data.cloudflare.workers.error
        : `${formatNumber(data.cloudflare.workers.requests)} requests, ${formatNumber(data.cloudflare.workers.subrequests)} subrequests, ${formatNumber(data.cloudflare.workers.errors)} errors`
    }`
  )
  if (!data.cloudflare.workers.error) {
    lines.push(`  CPU Time: P50 ${formatNumber(data.cloudflare.workers.cpuTimeP50)}μs, P99 ${formatNumber(data.cloudflare.workers.cpuTimeP99)}μs`)
    lines.push(`  Duration: P50 ${formatNumber(data.cloudflare.workers.durationP50)}ms, P99 ${formatNumber(data.cloudflare.workers.durationP99)}ms`)
  }
  lines.push(
    `D1 Database: ${
      data.cloudflare.d1.error
        ? data.cloudflare.d1.error
        : `${formatNumber(data.cloudflare.d1.readQueries)} reads, ${formatNumber(data.cloudflare.d1.writeQueries)} writes`
    }`
  )
  lines.push(
    `R2 Storage: ${
      data.cloudflare.r2.error
        ? data.cloudflare.r2.error
        : `${formatNumber(data.cloudflare.r2.requests)} requests`
    }`
  )

  // Section 4: GitHub - all commits are deployments
  lines.push("")
  lines.push("GITHUB ACTIVITY")
  lines.push("-".repeat(50))
  if (data.github.error) {
    lines.push(`Error: ${data.github.error}`)
  } else if (data.github.commits.totalCount === 0) {
    lines.push("No commits this month.")
  } else {
    lines.push(`Commits (Deployments): ${data.github.commits.totalCount}`)
    for (const commit of data.github.commits.sample) {
      const date = new Date(commit.commit.author.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      lines.push(`  - ${commit.commit.message.split("\n")[0]} (${commit.commit.author.name}, ${date})`)
    }
    if (data.github.commits.totalCount > 5) {
      lines.push(`  ... and ${data.github.commits.totalCount - 5} more`)
    }
  }

  // Section 5: Uptime
  lines.push("")
  lines.push("UPTIME")
  lines.push("-".repeat(50))
  if (data.uptime.length === 0) {
    lines.push("No uptime data recorded this month.")
  } else {
    for (const row of data.uptime) {
      lines.push(
        `${row.endpoint}: ${formatPercent(row.uptimePercent)} uptime, ${Math.round(row.avgLatencyMs)}ms avg`
      )
    }
  }

  // Section 6: Errors
  lines.push("")
  lines.push("APPLICATION ERRORS")
  lines.push("-".repeat(50))
  if (data.errors.byKind.length === 0) {
    lines.push("No application errors recorded this month.")
  } else {
    for (const row of data.errors.byKind) {
      lines.push(`${row.errorKind}: ${row.count}`)
    }
  }

  lines.push("")
  lines.push("=" .repeat(50))
  lines.push(`View full report: https://area36.org/reports/${data.monthKey}`)

  return lines.join("\n")
}

async function generateReport(env: Env, options: { useCurrentMonth?: boolean; forceRegenerate?: boolean } = {}) {
  const { start, end, monthKey } = options.useCurrentMonth 
    ? getCurrentMonthRange() 
    : getPreviousMonthRange()
  const generatedAt = new Date().toISOString()

  const existing = await env.DB.prepare("SELECT month FROM reports_monthly WHERE month = ?")
    .bind(monthKey)
    .first()
  if (existing && !options.forceRegenerate) {
    return { skipped: true, monthKey, reason: "Report already exists" }
  }
  
  // Delete existing report if forcing regeneration
  if (existing && options.forceRegenerate) {
    await env.DB.prepare("DELETE FROM reports_monthly WHERE month = ?").bind(monthKey).run()
  }

  let githubError: string | undefined
  let commits = { totalCount: 0, sample: [] as GitHubCommit[] }

  try {
    // All commits to main are treated as releases/deployments
    commits = await fetchGitHubCommits(env.GITHUB_TOKEN, start, end)
  } catch (error) {
    githubError = error instanceof Error ? error.message : String(error)
  }

  const cloudflareRaw = await fetchCloudflareMetrics(
    env.CLOUDFLARE_API_TOKEN,
    env.CLOUDFLARE_ACCOUNT_ID,
    start,
    end
  )
  const cloudflare = flattenCloudflareMetrics(cloudflareRaw)

  const events = await fetchEventDetails(env, start, end)
  const drive = await fetchDriveDeltas(env, start, end)
  const uptime = await fetchUptimeSummary(env, start, end)
  const errors = await fetchErrorSummary(env, start, end)

  const reportData: ReportData = {
    monthKey,
    generatedAt,
    events,
    drive,
    cloudflare,
    github: { commits, error: githubError },
    uptime,
    errors,
  }

  const htmlReport = renderHtmlReport(reportData)
  const textReport = renderTextReport(reportData)
  const jsonReport = JSON.stringify(reportData, null, 2)

  const htmlKey = `reports/${monthKey}/report.html`
  const jsonKey = `reports/${monthKey}/report.json`

  await env.REPORTS_BUCKET.put(htmlKey, htmlReport, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  })
  await env.REPORTS_BUCKET.put(jsonKey, jsonReport, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  })

  const subject = `Area 36 Website Monthly Report - ${formatMonthName(monthKey)}`

  await env.DB.prepare(
    "INSERT INTO reports_monthly (month, generated_at, subject, r2_key_html, r2_key_json) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(monthKey, generatedAt, subject, htmlKey, jsonKey)
    .run()

  const credentials = getGmailCredentials(env)
  const emailResult = await sendEmail(credentials, {
    to: REPORT_RECIPIENT,
    subject,
    body: textReport,
    textBody: textReport,
    htmlBody: htmlReport,
  })

  return {
    success: true,
    monthKey,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // Manual trigger endpoint (requires TRIGGER_SECRET)
    if (url.pathname === "/trigger" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization")
      const expectedToken = env.TRIGGER_SECRET
      
      if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return new Response("Unauthorized", { status: 401 })
      }
      
      // Parse options from query params
      const useCurrentMonth = url.searchParams.get("current") === "true"
      const forceRegenerate = url.searchParams.get("force") === "true"
      
      try {
        const result = await generateReport(env, { useCurrentMonth, forceRegenerate })
        return Response.json(result)
      } catch (error) {
        console.error("Report generation failed:", error)
        return Response.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        )
      }
    }
    
    return new Response("Not Found", { status: 404 })
  },

  async scheduled(_: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(generateReport(env).catch((err) => console.error("Scheduled report failed:", err)))
  },
}

export default worker
