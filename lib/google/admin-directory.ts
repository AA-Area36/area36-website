// Google Admin Directory API helpers for group membership checks
// Uses Web Crypto API for Cloudflare Workers compatibility

export interface AdminDirectoryCredentials {
  clientEmail: string
  privateKey: string
  privateKeyId: string
  subject: string
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPES = ["https://www.googleapis.com/auth/admin.directory.group.member.readonly"]
const MEMBERSHIP_TTL_MS = 5 * 60 * 1000

let memoryTokenCache: {
  accessToken: string
  expiresAt: number
  subject: string
} | null = null

const membershipCache = new Map<string, { isMember: boolean; expiresAt: number }>()

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n")
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = normalizePem(pem)
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data)
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data)
  } else {
    bytes = data
  }

  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function createJWT(credentials: AdminDirectoryCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.privateKeyId,
  }

  const payload = {
    iss: credentials.clientEmail,
    sub: credentials.subject,
    scope: SCOPES.join(" "),
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
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = base64UrlEncode(signature)
  return `${signatureInput}.${encodedSignature}`
}

async function exchangeJWTForToken(jwt: string): Promise<{ accessToken: string; expiresIn: number }> {
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
    const error = await response.text()
    throw new Error(`Failed to get Admin Directory access token: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

async function getAccessToken(credentials: AdminDirectoryCredentials): Promise<string> {
  if (
    memoryTokenCache &&
    memoryTokenCache.expiresAt > Date.now() + 5 * 60 * 1000 &&
    memoryTokenCache.subject === credentials.subject
  ) {
    return memoryTokenCache.accessToken
  }

  const jwt = await createJWT(credentials)
  const { accessToken, expiresIn } = await exchangeJWTForToken(jwt)
  memoryTokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    subject: credentials.subject,
  }
  return accessToken
}

export async function isGroupMember(
  credentials: AdminDirectoryCredentials,
  groupEmail: string,
  memberEmail: string
): Promise<boolean> {
  const cacheKey = `${groupEmail}:${memberEmail}`
  const cached = membershipCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.isMember
  }

  const accessToken = await getAccessToken(credentials)
  const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(
    groupEmail
  )}/hasMember/${encodeURIComponent(memberEmail)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Admin Directory API error ${response.status}: ${text}`)
  }

  const payload = (await response.json()) as { isMember?: boolean }
  const isMember = Boolean(payload.isMember)
  membershipCache.set(cacheKey, { isMember, expiresAt: Date.now() + MEMBERSHIP_TTL_MS })
  return isMember
}
