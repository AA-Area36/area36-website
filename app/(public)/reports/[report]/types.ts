export interface EventSummary {
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

export interface EventDetails {
  created: EventSummary[]
  updated: EventSummary[]
  summary: {
    createdCount: number
    updatedCount: number
  }
}

export interface DriveFile {
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

export interface DriveDelta {
  folderName: string
  created: DriveFile[]
  modified: DriveFile[]
  error?: string
}

export interface GitHubCommit {
  sha: string
  html_url: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
}

export interface WorkerErrorBreakdown {
  scriptThrewException: number
  exceededResources: number
  internalError: number
  clientDisconnected: number
}

export interface CloudflareMetrics {
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

export interface UptimeRow {
  endpoint: string
  checksTotal: number
  checksOk: number
  uptimePercent: number
  avgLatencyMs: number
  maxLatencyMs: number
}

export interface ErrorSummary {
  byKind: { errorKind: string; count: number }[]
  topErrors: {
    errorKind: string
    fingerprint: string
    count: number
    /** Present only in legacy private artifacts; never render in the public projection. */
    sampleMessage?: string | null
    sampleRoute: string | null
  }[]
}

export interface ReportData {
  monthKey: string
  generatedAt: string
  events: EventDetails
  drive: DriveDelta[]
  cloudflare: CloudflareMetrics
  github: {
    commits: { 
      totalCount: number
      sample: GitHubCommit[]  // For email (5 commits)
      all?: GitHubCommit[]    // For web (all commits)
    }
    error?: string
  }
  uptime: UptimeRow[]
  errors: ErrorSummary
}

export function redactPublicReportDiagnostics(data: ReportData): ReportData {
  return {
    ...data,
    errors: {
      ...data.errors,
      topErrors: data.errors.topErrors.map((row) => {
        const sanitized = { ...row }
        delete sanitized.sampleMessage
        return sanitized
      }),
    },
  }
}

// Legacy format support (old reports only have counts)
export interface LegacyEventData {
  created: number
  updated: number
}

export function isLegacyEventData(events: EventDetails | LegacyEventData): events is LegacyEventData {
  return typeof (events as LegacyEventData).created === "number"
}
