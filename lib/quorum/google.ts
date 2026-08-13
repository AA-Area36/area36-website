import { getCloudflareContext } from "@opennextjs/cloudflare"
import { clearGoogleServiceAccountToken, getGoogleServiceAccountAccessToken } from "@/lib/google/delegated-auth"
import { getGoogleServiceAccountCredentials } from "@/lib/google/sheets"
import { getQuorumDriveOwnerAccessToken } from "@/lib/google/user-drive-auth"
import { quorumEventKeySchema } from "@/lib/schemas/quorum"
import {
  QUORUM_APP_PROPERTIES,
  QUORUM_CONFIG_TAB,
  QUORUM_FEATURE_VALUE,
  QUORUM_HEADERS,
  QUORUM_ROOT_PROPERTY_KEY,
  QUORUM_ROOT_PROPERTY_VALUE,
  QUORUM_SCHEMA_VERSION,
  QUORUM_SUBMISSIONS_TAB,
  NEWSLETTER_DELIVERIES,
  SERVICE_POSITIONS,
  type NewsletterDelivery,
  type ServicePosition,
} from "./constants"
import type {
  QuorumAdminRow,
  QuorumCountingRow,
  QuorumEvent,
  QuorumEventStatus,
  VotingOverride,
} from "./types"
import type { QuorumRegistrationInput } from "@/lib/schemas/quorum"

const DRIVE_API = "https://www.googleapis.com/drive/v3"
const SHEETS_API = "https://sheets.googleapis.com/v4"
// The service account needs Drive scope to enumerate files explicitly shared
// with it. Drive ACLs still restrict it to the shared Quorum folder/resources.
const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/drive"]
const REQUEST_TIMEOUT_MS = 12_000

type QuorumGoogleConfig = {
  folderId: string
}

type DriveFile = {
  id: string
  name: string
  webViewLink?: string
  modifiedTime?: string
  appProperties?: Record<string, string>
}

type SheetValue = string | number | boolean | null

async function getConfiguredFolderId(): Promise<string | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const folderId = env.GDRIVE_QUORUM_FOLDER_ID?.trim()
    if (folderId) return folderId
  } catch {
    // Fall back to process env outside Cloudflare.
  }

  const folderId = process.env.GDRIVE_QUORUM_FOLDER_ID?.trim()
  return folderId || null
}

async function requestWithAccessToken<T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google API request failed: ${response.status} ${body.slice(0, 300)}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function googleRequest<T>(url: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
  const accessToken = await getGoogleServiceAccountAccessToken(GOOGLE_SCOPES)
  try {
    return await requestWithAccessToken<T>(url, accessToken, init)
  } catch (error) {
    if (retryOn401 && error instanceof Error && error.message.includes("Google API request failed: 401")) {
      await clearGoogleServiceAccountToken(GOOGLE_SCOPES)
      return googleRequest<T>(url, init, false)
    }
    throw error
  }
}

async function ownerGoogleRequest<T>(url: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
  const accessToken = await getQuorumDriveOwnerAccessToken(!retryOn401)
  try {
    return await requestWithAccessToken<T>(url, accessToken, init)
  } catch (error) {
    if (retryOn401 && error instanceof Error && error.message.includes("Google API request failed: 401")) {
      return ownerGoogleRequest<T>(url, init, false)
    }
    throw error
  }
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function quorumRootQuery(): string {
  return [
    "trashed = false",
    "mimeType = 'application/vnd.google-apps.folder'",
    `appProperties has { key='${QUORUM_ROOT_PROPERTY_KEY}' and value='${QUORUM_ROOT_PROPERTY_VALUE}' }`,
  ].join(" and ")
}

async function findQuorumFolder(request: typeof googleRequest | typeof ownerGoogleRequest): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    q: quorumRootQuery(),
    orderBy: "createdTime asc",
    pageSize: "10",
    fields: "files(id,name,webViewLink,modifiedTime,appProperties)",
    spaces: "drive",
  })
  const response = await request<{ files?: DriveFile[] }>(`${DRIVE_API}/files?${params}`)
  return response.files?.[0] ?? null
}

async function getQuorumGoogleConfig(): Promise<QuorumGoogleConfig> {
  const configuredFolderId = await getConfiguredFolderId()
  if (configuredFolderId) return { folderId: configuredFolderId }
  const folder = await findQuorumFolder(googleRequest)
  if (!folder) throw new Error("Quorum Google Drive is not configured")
  return { folderId: folder.id }
}

async function ensureQuorumFolder(): Promise<DriveFile> {
  const configuredFolderId = await getConfiguredFolderId()
  if (configuredFolderId) return { id: configuredFolderId, name: "Quorum" }

  const serviceFolder = await findQuorumFolder(googleRequest)
  if (serviceFolder) return serviceFolder

  const ownerFolder = await findQuorumFolder(ownerGoogleRequest)
  if (ownerFolder) return ownerFolder

  const folder = await ownerGoogleRequest<DriveFile>(
    `${DRIVE_API}/files?fields=id,name,webViewLink,modifiedTime,appProperties`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Quorum",
        mimeType: "application/vnd.google-apps.folder",
        appProperties: { [QUORUM_ROOT_PROPERTY_KEY]: QUORUM_ROOT_PROPERTY_VALUE },
      }),
    },
  )

  try {
    const credentials = await getGoogleServiceAccountCredentials()
    await ownerGoogleRequest(
      `${DRIVE_API}/files/${encodeURIComponent(folder.id)}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
      {
        method: "POST",
        body: JSON.stringify({ type: "user", role: "writer", emailAddress: credentials.clientEmail }),
      },
    )
  } catch (error) {
    await ownerGoogleRequest(`${DRIVE_API}/files/${encodeURIComponent(folder.id)}?supportsAllDrives=true`, {
      method: "DELETE",
    }).catch(() => undefined)
    throw error
  }

  return folder
}

function parseEvent(file: DriveFile): QuorumEvent | null {
  const properties = file.appProperties ?? {}
  const eventKey = properties[QUORUM_APP_PROPERTIES.eventKey]
  const title = properties[QUORUM_APP_PROPERTIES.title]
  const eventDate = properties[QUORUM_APP_PROPERTIES.eventDate]
  const quorumTarget = Number.parseInt(properties[QUORUM_APP_PROPERTIES.quorumTarget] ?? "", 10)
  const rawStatus = properties[QUORUM_APP_PROPERTIES.status]
  if (!eventKey || !title || !eventDate || !Number.isFinite(quorumTarget)) return null

  return {
    eventKey,
    spreadsheetId: file.id,
    title,
    eventDate,
    quorumTarget,
    status: rawStatus === "closed" ? "closed" : "open",
    featured: properties[QUORUM_APP_PROPERTIES.featured] === "1",
    webViewLink: file.webViewLink,
    modifiedTime: file.modifiedTime,
  }
}

async function listEventFiles(extraQuery?: string): Promise<DriveFile[]> {
  const config = await getQuorumGoogleConfig()
  const query = [
    `'${escapeDriveQueryValue(config.folderId)}' in parents`,
    "trashed = false",
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    `appProperties has { key='${QUORUM_APP_PROPERTIES.feature}' and value='${QUORUM_FEATURE_VALUE}' }`,
    extraQuery,
  ]
    .filter(Boolean)
    .join(" and ")
  const params = new URLSearchParams({
    q: query,
    orderBy: "modifiedTime desc",
    pageSize: "1000",
    fields: "files(id,name,webViewLink,modifiedTime,appProperties)",
    spaces: "drive",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  })
  const response = await googleRequest<{ files?: DriveFile[] }>(`${DRIVE_API}/files?${params}`)
  return response.files ?? []
}

export async function listQuorumEvents(): Promise<QuorumEvent[]> {
  const files = await listEventFiles()
  return files
    .map(parseEvent)
    .filter((event): event is QuorumEvent => !!event)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.title.localeCompare(b.title))
}

export async function getQuorumEventByKey(eventKey: string): Promise<QuorumEvent | null> {
  const parsedEventKey = quorumEventKeySchema.safeParse(eventKey)
  if (!parsedEventKey.success) return null
  const safeKey = escapeDriveQueryValue(parsedEventKey.data)
  const files = await listEventFiles(
    `appProperties has { key='${QUORUM_APP_PROPERTIES.eventKey}' and value='${safeKey}' }`,
  )
  return files.map(parseEvent).find((event): event is QuorumEvent => !!event) ?? null
}

export async function getFeaturedQuorumEvent(): Promise<QuorumEvent | null> {
  const files = await listEventFiles(
    `appProperties has { key='${QUORUM_APP_PROPERTIES.featured}' and value='1' }`,
  )
  const events = files.map(parseEvent).filter((event): event is QuorumEvent => !!event)
  return (
    events
      .filter((event) => event.featured && event.status === "open")
      .sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""))[0] ?? null
  )
}

export async function createQuorumEvent(input: {
  eventKey: string
  title: string
  eventDate: string
  quorumTarget: number
  featured: boolean
}): Promise<QuorumEvent> {
  const folder = await ensureQuorumFolder()
  const file = await ownerGoogleRequest<DriveFile>(
    `${DRIVE_API}/files?fields=id,name,webViewLink,modifiedTime,appProperties&supportsAllDrives=true`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${input.eventDate} — ${input.title} — Quorum`,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [folder.id],
        appProperties: {
          [QUORUM_APP_PROPERTIES.feature]: QUORUM_FEATURE_VALUE,
          [QUORUM_APP_PROPERTIES.eventKey]: input.eventKey,
          [QUORUM_APP_PROPERTIES.title]: input.title,
          [QUORUM_APP_PROPERTIES.eventDate]: input.eventDate,
          [QUORUM_APP_PROPERTIES.quorumTarget]: String(input.quorumTarget),
          [QUORUM_APP_PROPERTIES.status]: "open",
          [QUORUM_APP_PROPERTIES.featured]: input.featured ? "1" : "0",
          [QUORUM_APP_PROPERTIES.schemaVersion]: QUORUM_SCHEMA_VERSION,
        },
      }),
    },
  )

  try {
    await ownerGoogleRequest(
      `${SHEETS_API}/spreadsheets/${encodeURIComponent(file.id)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: { sheetId: 0, title: QUORUM_SUBMISSIONS_TAB, gridProperties: { frozenRowCount: 1 } },
                fields: "title,gridProperties.frozenRowCount",
              },
            },
            { addSheet: { properties: { title: QUORUM_CONFIG_TAB, hidden: true } } },
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.08, green: 0.22, blue: 0.36 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            },
          ],
        }),
      },
    )
    await ownerGoogleRequest(
      `${SHEETS_API}/spreadsheets/${encodeURIComponent(file.id)}/values:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: [
            { range: `${QUORUM_SUBMISSIONS_TAB}!A1:V1`, values: [[...QUORUM_HEADERS]] },
            {
              range: `${QUORUM_CONFIG_TAB}!A1:B7`,
              values: [
                ["Event Key", input.eventKey],
                ["Title", input.title],
                ["Event Date", input.eventDate],
                ["Required Voting Members", input.quorumTarget],
                ["Status", "open"],
                ["Featured", input.featured],
                ["Schema Version", QUORUM_SCHEMA_VERSION],
              ],
            },
          ],
        }),
      },
    )
  } catch (error) {
    await ownerGoogleRequest(`${DRIVE_API}/files/${encodeURIComponent(file.id)}?supportsAllDrives=true`, {
      method: "DELETE",
    }).catch(() => undefined)
    throw error
  }

  const event = parseEvent(file)
  if (!event) throw new Error("Created quorum event metadata is invalid")
  return event
}

async function patchEventProperties(
  event: QuorumEvent,
  properties: Record<string, string>,
): Promise<void> {
  await googleRequest(
    `${DRIVE_API}/files/${encodeURIComponent(event.spreadsheetId)}?fields=id&supportsAllDrives=true`,
    { method: "PATCH", body: JSON.stringify({ appProperties: properties }) },
  )
}

export async function setQuorumEventFeatured(eventKey: string): Promise<void> {
  const events = await listQuorumEvents()
  const selected = events.find((event) => event.eventKey === eventKey)
  if (!selected || selected.status !== "open") throw new Error("Open quorum event not found")

  await patchEventProperties(selected, { [QUORUM_APP_PROPERTIES.featured]: "1" })
  await Promise.all(
    events
      .filter((event) => event.eventKey !== eventKey && event.featured)
      .map((event) => patchEventProperties(event, { [QUORUM_APP_PROPERTIES.featured]: "0" })),
  )
}

export async function closeQuorumEvent(eventKey: string): Promise<void> {
  const event = await getQuorumEventByKey(eventKey)
  if (!event) throw new Error("Quorum event not found")
  await patchEventProperties(event, {
    [QUORUM_APP_PROPERTIES.status]: "closed",
    [QUORUM_APP_PROPERTIES.featured]: "0",
  })
  await googleRequest(
    `${SHEETS_API}/spreadsheets/${encodeURIComponent(event.spreadsheetId)}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [
          { range: `${QUORUM_CONFIG_TAB}!B5`, values: [["closed"]] },
          { range: `${QUORUM_CONFIG_TAB}!B6`, values: [[false]] },
        ],
      }),
    },
  )
}

export async function appendQuorumSubmission(input: {
  event: QuorumEvent
  submissionId: string
  submittedAt: string
  registration: QuorumRegistrationInput
  isAlternate: boolean
  seatKey: string
}): Promise<void> {
  const row: SheetValue[] = [
    input.submissionId,
    input.submittedAt,
    input.registration.name,
    input.registration.district,
    input.registration.homeGroup,
    input.registration.servicePosition,
    input.registration.positionDetail,
    input.isAlternate,
    input.registration.email,
    input.registration.phone,
    input.registration.streetAddress,
    input.registration.city,
    input.registration.state,
    input.registration.zip,
    input.seatKey,
    "",
    true,
    "",
    "",
    "",
    `/quorum/${input.event.eventKey}`,
    input.registration.newsletterDelivery,
  ]
  const range = encodeURIComponent(`${QUORUM_SUBMISSIONS_TAB}!A:V`)
  await googleRequest(
    `${SHEETS_API}/spreadsheets/${encodeURIComponent(input.event.spreadsheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  )
}

function asString(value: unknown): string {
  return value == null ? "" : String(value)
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value
  const normalized = asString(value).trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return fallback
}

function asServicePosition(value: unknown): ServicePosition {
  const normalized = asString(value) as ServicePosition
  return SERVICE_POSITIONS.includes(normalized) ? normalized : "other"
}

function asVotingOverride(value: unknown): VotingOverride {
  const normalized = asString(value)
  return normalized === "voting" || normalized === "non_voting" ? normalized : ""
}

function asNewsletterDelivery(value: unknown): NewsletterDelivery {
  const normalized = asString(value) as NewsletterDelivery
  return NEWSLETTER_DELIVERIES.includes(normalized) ? normalized : "neither"
}

export async function getQuorumCountingRows(spreadsheetId: string): Promise<QuorumCountingRow[]> {
  const params = new URLSearchParams({ majorDimension: "ROWS", valueRenderOption: "UNFORMATTED_VALUE" })
  for (const range of ["A2:B", "F2:H", "O2:Q"]) {
    params.append("ranges", `${QUORUM_SUBMISSIONS_TAB}!${range}`)
  }
  const response = await googleRequest<{ valueRanges?: Array<{ values?: unknown[][] }> }>(
    `${SHEETS_API}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params}`,
  )
  const identityRows = response.valueRanges?.[0]?.values ?? []
  const roleRows = response.valueRanges?.[1]?.values ?? []
  const countingRows = response.valueRanges?.[2]?.values ?? []
  const length = Math.max(identityRows.length, roleRows.length, countingRows.length)

  return Array.from({ length }, (_, index) => ({
    submissionId: asString(identityRows[index]?.[0]),
    submittedAt: asString(identityRows[index]?.[1]),
    servicePosition: asServicePosition(roleRows[index]?.[0]),
    positionDetail: asString(roleRows[index]?.[1]),
    isAlternate: asBoolean(roleRows[index]?.[2]),
    seatKey: asString(countingRows[index]?.[0]),
    adminVotingOverride: asVotingOverride(countingRows[index]?.[1]),
    counted: asBoolean(countingRows[index]?.[2], true),
  })).filter((row) => row.submissionId)
}

export async function getQuorumAdminRows(spreadsheetId: string): Promise<QuorumAdminRow[]> {
  const range = encodeURIComponent(`${QUORUM_SUBMISSIONS_TAB}!A2:V`)
  const response = await googleRequest<{ values?: unknown[][] }>(
    `${SHEETS_API}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`,
  )
  return (response.values ?? [])
    .map((row, index) => ({
      sheetRowNumber: index + 2,
      submissionId: asString(row[0]),
      submittedAt: asString(row[1]),
      name: asString(row[2]),
      district: asString(row[3]),
      homeGroup: asString(row[4]),
      servicePosition: asServicePosition(row[5]),
      positionDetail: asString(row[6]),
      isAlternate: asBoolean(row[7]),
      email: asString(row[8]),
      phone: asString(row[9]),
      streetAddress: asString(row[10]),
      city: asString(row[11]),
      state: asString(row[12]),
      zip: asString(row[13]),
      seatKey: asString(row[14]),
      adminVotingOverride: asVotingOverride(row[15]),
      counted: asBoolean(row[16], true),
      correctionReason: asString(row[17]),
      correctedBy: asString(row[18]),
      correctedAt: asString(row[19]),
      source: asString(row[20]),
      newsletterDelivery: asNewsletterDelivery(row[21]),
    }))
    .filter((row) => row.submissionId)
}

function rowNumberFor(rows: QuorumAdminRow[], submissionId: string): number {
  const row = rows.find((candidate) => candidate.submissionId === submissionId)
  if (!row) throw new Error("Submission not found")
  return row.sheetRowNumber
}

export async function applyQuorumCorrection(input: {
  event: QuorumEvent
  submissionId: string
  action: "exclude" | "restore" | "make_voting" | "make_non_voting" | "clear_override"
  reason: string
  correctedBy: string
}): Promise<void> {
  const rows = await getQuorumAdminRows(input.event.spreadsheetId)
  const target = rows.find((row) => row.submissionId === input.submissionId)
  if (!target) throw new Error("Submission not found")
  const correctedAt = new Date().toISOString()
  const data: Array<{ range: string; values: SheetValue[][] }> = []

  const auditRow = (rowNumber: number, reason: string) => {
    data.push(
      { range: `${QUORUM_SUBMISSIONS_TAB}!R${rowNumber}`, values: [[reason]] },
      { range: `${QUORUM_SUBMISSIONS_TAB}!S${rowNumber}:T${rowNumber}`, values: [[input.correctedBy, correctedAt]] },
    )
  }

  if (input.action === "exclude" || input.action === "restore") {
    const rowNumber = rowNumberFor(rows, target.submissionId)
    data.push({ range: `${QUORUM_SUBMISSIONS_TAB}!Q${rowNumber}`, values: [[input.action === "restore"]] })
    auditRow(rowNumber, input.reason)
  } else if (input.action === "make_voting") {
    if (!target.seatKey) throw new Error("This attendee does not represent a voting seat")
    for (const row of rows.filter((candidate) => candidate.counted && candidate.seatKey === target.seatKey)) {
      const rowNumber = rowNumberFor(rows, row.submissionId)
      data.push({
        range: `${QUORUM_SUBMISSIONS_TAB}!P${rowNumber}`,
        values: [[row.submissionId === target.submissionId ? "voting" : "non_voting"]],
      })
      auditRow(rowNumber, input.reason)
    }
  } else {
    const rowNumber = rowNumberFor(rows, target.submissionId)
    data.push({
      range: `${QUORUM_SUBMISSIONS_TAB}!P${rowNumber}`,
      values: [[input.action === "make_non_voting" ? "non_voting" : ""]],
    })
    auditRow(rowNumber, input.reason)
  }

  await googleRequest(
    `${SHEETS_API}/spreadsheets/${encodeURIComponent(input.event.spreadsheetId)}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    },
  )
}

export function isQuorumGoogleConfiguredError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Quorum Google Drive is not configured")
}

export function quorumStatusLabel(status: QuorumEventStatus): string {
  return status === "closed" ? "Closed" : "Open"
}
