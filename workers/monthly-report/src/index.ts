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
}

const REPORT_RECIPIENT = "webmaster@area36.org"
const GITHUB_REPO = "AA-Area36/area36-website"

interface GitHubRelease {
  name: string
  tag_name: string
  published_at: string
  html_url: string
}

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
  createdTime: string
  modifiedTime: string
  webViewLink?: string
}

interface DriveDelta {
  folderName: string
  created: DriveFile[]
  modified: DriveFile[]
  error?: string
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

function formatBytes(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
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

async function githubRequest<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${text}`)
  }

  return (await response.json()) as T
}

async function fetchGitHubReleases(token: string | undefined, start: Date, end: Date) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=100`
  const releases = await githubRequest<GitHubRelease[]>(url, token)
  return releases.filter((release) => {
    const published = new Date(release.published_at)
    return published >= start && published < end
  })
}

async function fetchGitHubCommits(token: string | undefined, start: Date, end: Date) {
  const baseUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits`
  const params = new URLSearchParams({
    since: start.toISOString(),
    until: end.toISOString(),
    per_page: "100",
  })

  const firstUrl = `${baseUrl}?${params.toString()}`
  const firstResponse = await fetch(firstUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!firstResponse.ok) {
    const text = await firstResponse.text()
    throw new Error(`GitHub API error ${firstResponse.status}: ${text}`)
  }

  const firstPage = (await firstResponse.json()) as GitHubCommit[]
  const links = parseLinkHeader(firstResponse.headers.get("Link"))

  let totalCount = firstPage.length
  if (links.last) {
    const lastUrl = links.last
    const lastResponse = await fetch(lastUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (lastResponse.ok) {
      const lastPage = (await lastResponse.json()) as GitHubCommit[]
      const lastPageNum = Number(new URL(lastUrl).searchParams.get("page") || "1")
      totalCount = (lastPageNum - 1) * 100 + lastPage.length
    }
  }

  return {
    totalCount,
    sample: firstPage.slice(0, 5),
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
  const variables = { since: start.toISOString(), until: end.toISOString() }

  const workersQuery = `query($accountTag: String!, $since: DateTime!, $until: DateTime!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(filter: { datetime_geq: $since, datetime_lt: $until }) {
          sum {
            requests
            errors
            subrequests
            cpuTime
            duration
          }
        }
      }
    }
  }`

  const d1Query = `query($accountTag: String!, $since: DateTime!, $until: DateTime!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        d1AnalyticsAdaptive(filter: { datetime_geq: $since, datetime_lt: $until }) {
          sum {
            queries
            errors
            readUnits
            writeUnits
          }
        }
      }
    }
  }`

  const r2Query = `query($accountTag: String!, $since: DateTime!, $until: DateTime!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        r2OperationsAdaptive(filter: { datetime_geq: $since, datetime_lt: $until }) {
          sum {
            classA
            classB
            egressBytes
          }
        }
      }
    }
  }`

  const pagesQuery = `query($accountTag: String!, $since: DateTime!, $until: DateTime!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        pagesFunctionsInvocationsAdaptive(filter: { datetime_geq: $since, datetime_lt: $until }) {
          sum {
            requests
            errors
            cpuTime
          }
        }
      }
    }
  }`

  const [workers, d1, r2, pages] = await Promise.all([
    fetchCloudflareQuery(token, accountId, workersQuery, variables),
    fetchCloudflareQuery(token, accountId, d1Query, variables),
    fetchCloudflareQuery(token, accountId, r2Query, variables),
    fetchCloudflareQuery(token, accountId, pagesQuery, variables),
  ])

  return { workers, d1, r2, pages }
}

async function listDriveFilesModified(
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
  const files: DriveFile[] = []
  let pageToken: string | undefined

  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const fields = "files(id,name,createdTime,modifiedTime,webViewLink),nextPageToken"
  const q = `'${folderId}' in parents and trashed = false and modifiedTime >= '${startIso}' and modifiedTime < '${endIso}'`

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
    files.push(...payload.files)
    pageToken = payload.nextPageToken
  } while (pageToken)

  return files
}

async function fetchDriveDeltas(env: Env, start: Date, end: Date): Promise<DriveDelta[]> {
  const folders: { name: string; id?: string }[] = [
    { name: "Newsletters", id: env.GDRIVE_NEWSLETTERS_FOLDER_ID },
    { name: "Resources", id: env.GDRIVE_RESOURCES_FOLDER_ID },
    { name: "Recordings", id: env.GDRIVE_RECORDINGS_FOLDER_ID },
    { name: "Committees", id: env.GDRIVE_COMMITTEES_FOLDER_ID },
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
      const files = await listDriveFilesModified(env, folder.id, start, end)
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

async function fetchEventDeltas(env: Env, start: Date, end: Date) {
  const startSql = formatSqliteDate(start)
  const endSql = formatSqliteDate(end)

  const created = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE created_at >= ? AND created_at < ?"
  )
    .bind(startSql, endSql)
    .first<{ count: number }>()

  const updated = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE updated_at >= ? AND updated_at < ?"
  )
    .bind(startSql, endSql)
    .first<{ count: number }>()

  return {
    created: created?.count ?? 0,
    updated: updated?.count ?? 0,
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

function renderHtmlReport(data: {
  monthKey: string
  github: {
    releases: GitHubRelease[]
    commits: { totalCount: number; sample: GitHubCommit[] }
    error?: string
  }
  cloudflare: CloudflareMetrics
  events: { created: number; updated: number }
  drive: DriveDelta[]
  uptime: ReturnType<typeof fetchUptimeSummary> extends Promise<infer T> ? T : never
  errors: ReturnType<typeof fetchErrorSummary> extends Promise<infer T> ? T : never
  generatedAt: string
}) {
  const { monthKey, github, cloudflare, events, drive, uptime, errors, generatedAt } = data
  const workersSum = (cloudflare.workers.data as any)?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0]?.sum
  const d1Sum = (cloudflare.d1.data as any)?.viewer?.accounts?.[0]?.d1AnalyticsAdaptive?.[0]?.sum
  const r2Sum = (cloudflare.r2.data as any)?.viewer?.accounts?.[0]?.r2OperationsAdaptive?.[0]?.sum
  const pagesSum = (cloudflare.pages.data as any)?.viewer?.accounts?.[0]?.pagesFunctionsInvocationsAdaptive?.[0]?.sum

  const githubSection = github.error
    ? `<p>GitHub data unavailable: ${github.error}</p>`
    : github.releases.length > 0
      ? `<ul>${github.releases
          .map(
            (release) =>
              `<li><strong>${release.name || release.tag_name}</strong> (${release.published_at.slice(0, 10)}) - ${release.html_url}</li>`
          )
          .join("")}</ul>`
      : `<p>No releases. Commit count: ${github.commits.totalCount}</p>
         <ul>${github.commits.sample
           .map((commit) => `<li>${commit.commit.message.split("\n")[0]}</li>`)
           .join("")}</ul>`

  const driveSection = drive
    .map((delta) => {
      if (delta.error) {
        return `<li><strong>${delta.folderName}:</strong> ${delta.error}</li>`
      }
      return `<li><strong>${delta.folderName}:</strong> ${delta.created.length} new, ${delta.modified.length} updated</li>`
    })
    .join("")

  const uptimeSection = uptime.length
    ? `<table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Endpoint</th><th>Checks</th><th>Uptime</th><th>Avg Latency</th><th>Max Latency</th></tr></thead>
        <tbody>
          ${uptime
            .map(
              (row) =>
                `<tr>
                  <td>${row.endpoint}</td>
                  <td>${row.checksTotal}</td>
                  <td>${formatPercent(row.uptimePercent)}</td>
                  <td>${Math.round(row.avgLatencyMs)} ms</td>
                  <td>${row.maxLatencyMs} ms</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : "<p>No uptime data recorded for this month.</p>"

  const errorKindSection = errors.byKind.length
    ? `<ul>${errors.byKind.map((row) => `<li>${row.errorKind}: ${row.count}</li>`).join("")}</ul>`
    : "<p>No errors recorded.</p>"

  const topErrorsSection = errors.topErrors.length
    ? `<ul>${errors.topErrors
        .map(
          (row) =>
            `<li>${row.errorKind} (${row.count}) ${row.sampleRoute ? `@ ${row.sampleRoute}` : ""}: ${row.sampleMessage ?? ""}</li>`
        )
        .join("")}</ul>`
    : "<p>No error samples.</p>"

  const cloudflareSection = `
    <ul>
      <li><strong>Workers:</strong> ${
        cloudflare.workers.error
          ? cloudflare.workers.error
          : `requests ${formatNumber(workersSum?.requests)}, errors ${formatNumber(workersSum?.errors)}, cpu ${formatNumber(
              workersSum?.cpuTime
            )}`
      }</li>
      <li><strong>D1:</strong> ${
        cloudflare.d1.error
          ? cloudflare.d1.error
          : `queries ${formatNumber(d1Sum?.queries)}, errors ${formatNumber(d1Sum?.errors)}, read units ${formatNumber(
              d1Sum?.readUnits
            )}, write units ${formatNumber(d1Sum?.writeUnits)}`
      }</li>
      <li><strong>R2:</strong> ${
        cloudflare.r2.error
          ? cloudflare.r2.error
          : `class A ${formatNumber(r2Sum?.classA)}, class B ${formatNumber(r2Sum?.classB)}, egress ${formatBytes(
              r2Sum?.egressBytes
            )}`
      }</li>
      <li><strong>Pages:</strong> ${
        cloudflare.pages.error
          ? cloudflare.pages.error
          : `requests ${formatNumber(pagesSum?.requests)}, errors ${formatNumber(pagesSum?.errors)}, cpu ${formatNumber(
              pagesSum?.cpuTime
            )}`
      }</li>
    </ul>
  `

  return `
  <html>
    <body style="font-family: Arial, sans-serif; color: #1f2937;">
      <h1>Area 36 Monthly Report - ${monthKey}</h1>
      <p>Generated at ${generatedAt}</p>

      <h2>GitHub</h2>
      ${githubSection}

      <h2>Cloudflare Usage</h2>
      ${cloudflareSection}

      <h2>D1 Event Deltas</h2>
      <p>Events created: ${events.created}</p>
      <p>Events updated: ${events.updated}</p>

      <h2>Drive Deltas</h2>
      <ul>${driveSection}</ul>

      <h2>Uptime</h2>
      ${uptimeSection}

      <h2>Errors</h2>
      <h3>By Kind</h3>
      ${errorKindSection}
      <h3>Top Samples</h3>
      ${topErrorsSection}
    </body>
  </html>
  `.trim()
}

function renderTextReport(data: {
  monthKey: string
  github: {
    releases: GitHubRelease[]
    commits: { totalCount: number; sample: GitHubCommit[] }
    error?: string
  }
  cloudflare: CloudflareMetrics
  events: { created: number; updated: number }
  drive: DriveDelta[]
  uptime: ReturnType<typeof fetchUptimeSummary> extends Promise<infer T> ? T : never
  errors: ReturnType<typeof fetchErrorSummary> extends Promise<infer T> ? T : never
  generatedAt: string
}) {
  const lines: string[] = []
  lines.push(`Area 36 Monthly Report - ${data.monthKey}`)
  lines.push(`Generated at: ${data.generatedAt}`)
  lines.push("")

  const workersSum = (data.cloudflare.workers.data as any)?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0]?.sum
  const d1Sum = (data.cloudflare.d1.data as any)?.viewer?.accounts?.[0]?.d1AnalyticsAdaptive?.[0]?.sum
  const r2Sum = (data.cloudflare.r2.data as any)?.viewer?.accounts?.[0]?.r2OperationsAdaptive?.[0]?.sum
  const pagesSum = (data.cloudflare.pages.data as any)?.viewer?.accounts?.[0]?.pagesFunctionsInvocationsAdaptive?.[0]?.sum

  lines.push("GitHub")
  if (data.github.error) {
    lines.push(`- Error: ${data.github.error}`)
  } else if (data.github.releases.length > 0) {
    for (const release of data.github.releases) {
      lines.push(`- Release: ${release.name || release.tag_name} (${release.published_at.slice(0, 10)})`)
    }
  } else {
    lines.push(`- No releases. Commit count: ${data.github.commits.totalCount}`)
    for (const commit of data.github.commits.sample) {
      lines.push(`- ${commit.commit.message.split("\n")[0]}`)
    }
  }
  lines.push("")

  lines.push("Cloudflare Usage")
  lines.push(
    `- Workers: ${
      data.cloudflare.workers.error
        ? data.cloudflare.workers.error
        : `requests ${formatNumber(workersSum?.requests)}, errors ${formatNumber(
            workersSum?.errors
          )}, cpu ${formatNumber(workersSum?.cpuTime)}`
    }`
  )
  lines.push(
    `- D1: ${
      data.cloudflare.d1.error
        ? data.cloudflare.d1.error
        : `queries ${formatNumber(d1Sum?.queries)}, errors ${formatNumber(d1Sum?.errors)}, read units ${formatNumber(
            d1Sum?.readUnits
          )}, write units ${formatNumber(d1Sum?.writeUnits)}`
    }`
  )
  lines.push(
    `- R2: ${
      data.cloudflare.r2.error
        ? data.cloudflare.r2.error
        : `class A ${formatNumber(r2Sum?.classA)}, class B ${formatNumber(r2Sum?.classB)}, egress ${formatBytes(
            r2Sum?.egressBytes
          )}`
    }`
  )
  lines.push(
    `- Pages: ${
      data.cloudflare.pages.error
        ? data.cloudflare.pages.error
        : `requests ${formatNumber(pagesSum?.requests)}, errors ${formatNumber(
            pagesSum?.errors
          )}, cpu ${formatNumber(pagesSum?.cpuTime)}`
    }`
  )
  lines.push("")

  lines.push("Events")
  lines.push(`- Created: ${data.events.created}`)
  lines.push(`- Updated: ${data.events.updated}`)
  lines.push("")

  lines.push("Drive")
  for (const delta of data.drive) {
    if (delta.error) {
      lines.push(`- ${delta.folderName}: ${delta.error}`)
    } else {
      lines.push(`- ${delta.folderName}: ${delta.created.length} new, ${delta.modified.length} updated`)
    }
  }
  lines.push("")

  lines.push("Uptime")
  if (data.uptime.length === 0) {
    lines.push("- No uptime data recorded.")
  } else {
    for (const row of data.uptime) {
      lines.push(
        `- ${row.endpoint}: ${formatPercent(row.uptimePercent)} (${row.checksOk}/${row.checksTotal}), avg ${Math.round(
          row.avgLatencyMs
        )} ms, max ${row.maxLatencyMs} ms`
      )
    }
  }
  lines.push("")

  lines.push("Errors")
  if (data.errors.byKind.length === 0) {
    lines.push("- No errors recorded.")
  } else {
    for (const row of data.errors.byKind) {
      lines.push(`- ${row.errorKind}: ${row.count}`)
    }
  }

  return lines.join("\n")
}

export default {
  async scheduled(_: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const { start, end, monthKey } = getPreviousMonthRange()
        const generatedAt = new Date().toISOString()

        const existing = await env.DB.prepare("SELECT month FROM reports_monthly WHERE month = ?")
          .bind(monthKey)
          .first()
        if (existing) {
          console.log(`Monthly report for ${monthKey} already exists. Skipping.`)
          return
        }

        let githubError: string | undefined
        let releases: GitHubRelease[] = []
        let commits = { totalCount: 0, sample: [] as GitHubCommit[] }

        try {
          releases = await fetchGitHubReleases(env.GITHUB_TOKEN, start, end)
          if (releases.length === 0) {
            commits = await fetchGitHubCommits(env.GITHUB_TOKEN, start, end)
          }
        } catch (error) {
          githubError = error instanceof Error ? error.message : String(error)
        }

        const cloudflare = await fetchCloudflareMetrics(
          env.CLOUDFLARE_API_TOKEN,
          env.CLOUDFLARE_ACCOUNT_ID,
          start,
          end
        )

        const events = await fetchEventDeltas(env, start, end)
        const drive = await fetchDriveDeltas(env, start, end)
        const uptime = await fetchUptimeSummary(env, start, end)
        const errors = await fetchErrorSummary(env, start, end)

        const reportData = {
          monthKey,
          github: { releases, commits, error: githubError },
          cloudflare,
          events,
          drive,
          uptime,
          errors,
          generatedAt,
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

        const subject = `Area 36 Monthly Report - ${monthKey}`

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
        if (!emailResult.success) {
          console.error("Monthly report email failed:", emailResult.error)
        }
      })()
    )
  },
}
