// Google Drive service account JWT authentication
// Uses Web Crypto API for Cloudflare Workers compatibility

import type { GDriveCredentials } from "./types"

// Token cache (module-level for persistence across requests in same isolate)
let tokenCache: {
  accessToken: string
  expiresAt: number
} | null = null

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

/**
 * Convert PEM-encoded private key to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Handle escaped newlines from environment variables
  const normalizedPem = pem.replace(/\\n/g, "\n")

  // Remove PEM headers and whitespace
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")

  // Decode base64
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Base64URL encode (JWT-safe encoding)
 */
function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data)
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data)
  } else {
    bytes = data
  }

  // Use btoa for binary to base64
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Create a signed JWT for Google service account authentication
 */
async function createJWT(credentials: GDriveCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // JWT Header
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.privateKeyId,
  }

  // JWT Payload (Claims)
  const payload = {
    iss: credentials.clientEmail,
    scope: SCOPES.join(" "),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: expiry,
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  // Combine into complete JWT
  const encodedSignature = base64UrlEncode(signature)
  return `${signatureInput}.${encodedSignature}`
}

/**
 * Exchange JWT for Google access token
 */
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
    throw new Error(`Failed to get access token: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

/**
 * Get a valid access token, using cache when possible
 */
export async function getAccessToken(credentials: GDriveCredentials): Promise<string> {
  // Check if cached token is still valid (with 5 minute buffer)
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.accessToken
  }

  // Create new JWT and exchange for access token
  const jwt = await createJWT(credentials)
  const { accessToken, expiresIn } = await exchangeJWTForToken(jwt)

  // Cache the token
  tokenCache = {
    accessToken,
    expiresAt: now + expiresIn * 1000,
  }

  return accessToken
}

/**
 * Clear the token cache (useful for handling 401 errors)
 */
export function clearTokenCache(): void {
  tokenCache = null
}
