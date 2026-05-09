import { getCloudflareContext } from "@opennextjs/cloudflare"

type GoogleCredentials = {
  clientEmail: string
  privateKey: string
  privateKeyId: string
}

type TokenCache = {
  accessToken: string
  expiresAt: number
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const TOKEN_CACHE_KEY = "https://cache.internal/google-sheets-token"
const SHEETS_CACHE_NAME = "google-sheets-auth"
const DEFAULT_AREA_ASSEMBLY_SHEET_ID = "1fVowzQNlRbqnqqKhvrky9oNbtEHbK3YflD-JnILbUuk"
const CONFERENCE_MANUAL_COUNTS_SHEET_ID = "1fHsLspjOyhgevM0JqNcwVUHcCxW0UXzX1A328XNbRaU"

let memoryTokenCache: TokenCache | null = null

function getRequiredEnv(name: keyof CloudflareEnv | keyof NodeJS.ProcessEnv): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export async function getGoogleServiceAccountCredentials(): Promise<GoogleCredentials> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    if (env.GDRIVE_SERVICE_ACCOUNT_EMAIL && env.GDRIVE_PRIVATE_KEY && env.GDRIVE_PRIVATE_KEY_ID) {
      return {
        clientEmail: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
        privateKey: env.GDRIVE_PRIVATE_KEY,
        privateKeyId: env.GDRIVE_PRIVATE_KEY_ID,
      }
    }
  } catch {
    // Not running in Cloudflare context.
  }

  return {
    clientEmail: getRequiredEnv("GDRIVE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: getRequiredEnv("GDRIVE_PRIVATE_KEY"),
    privateKeyId: getRequiredEnv("GDRIVE_PRIVATE_KEY_ID"),
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalizedPem = pem.replace(/\\n/g, "\n")
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")

  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return bytes.buffer
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : data

  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function getTokenFromCache(): Promise<TokenCache | null> {
  if (memoryTokenCache && memoryTokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return memoryTokenCache
  }

  try {
    const cache = await caches.open(SHEETS_CACHE_NAME)
    const response = await cache.match(TOKEN_CACHE_KEY)
    if (!response) {
      return null
    }

    const data = (await response.json()) as TokenCache
    if (data.expiresAt > Date.now() + 5 * 60 * 1000) {
      memoryTokenCache = data
      return data
    }
  } catch {
    // Cache API is unavailable in local development.
  }

  return null
}

async function setTokenInCache(accessToken: string, expiresAt: number): Promise<void> {
  const data = { accessToken, expiresAt }
  memoryTokenCache = data

  try {
    const cache = await caches.open(SHEETS_CACHE_NAME)
    const ttl = Math.floor((expiresAt - Date.now()) / 1000)
    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${Math.max(ttl - 300, 60)}`,
      },
    })
    await cache.put(TOKEN_CACHE_KEY, response)
  } catch {
    // Cache API is unavailable in local development.
  }
}

async function createJwt(credentials: GoogleCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.privateKeyId,
  }

  const payload = {
    iss: credentials.clientEmail,
    scope: SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: expiry,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput),
  )

  return `${signatureInput}.${base64UrlEncode(signature)}`
}

async function getAccessToken(): Promise<string> {
  const cached = await getTokenFromCache()
  if (cached) {
    return cached.accessToken
  }

  const credentials = await getGoogleServiceAccountCredentials()
  const jwt = await createJwt(credentials)

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get Google Sheets token: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  const expiresAt = Date.now() + data.expires_in * 1000
  await setTokenInCache(data.access_token, expiresAt)

  return data.access_token
}

async function appendSpreadsheetRow(
  spreadsheetId: string,
  rangeName: string,
  values: Array<string | number>,
): Promise<void> {
  const accessToken = await getAccessToken()
  const range = encodeURIComponent(rangeName)

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [values] }),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to append spreadsheet row: ${response.status} ${await response.text()}`)
  }
}

export async function appendAreaAssemblyRegistration(values: string[]): Promise<void> {
  await appendSpreadsheetRow(DEFAULT_AREA_ASSEMBLY_SHEET_ID, "Sheet1!A:G", values)
}

export async function appendConferenceManualCount(values: Array<string | number>): Promise<void> {
  await appendSpreadsheetRow(CONFERENCE_MANUAL_COUNTS_SHEET_ID, "A:F", values)
}
