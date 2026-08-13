import { getCloudflareContext } from "@opennextjs/cloudflare"

export const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"

type StoredGoogleAccount = {
  id: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  scope: string | null
}

function scopeSet(scope: string | null): Set<string> {
  return new Set((scope ?? "").split(/\s+/).filter(Boolean))
}

async function getOwnerEmail(env: CloudflareEnv): Promise<string> {
  const email = (env.QUORUM_DRIVE_OWNER_EMAIL || env.GMAIL_SENDER_EMAIL)?.trim().toLowerCase()
  if (!email) throw new Error("Quorum Drive owner email is not configured")
  return email
}

async function getStoredAccount(env: CloudflareEnv): Promise<StoredGoogleAccount | null> {
  const ownerEmail = await getOwnerEmail(env)
  return env.DB.prepare(
    `SELECT a.id,
            a.access_token AS accessToken,
            a.refresh_token AS refreshToken,
            a.expires_at AS expiresAt,
            a.scope
       FROM accounts a
       JOIN users u ON u.id = a.userId
      WHERE a.provider = 'google' AND lower(u.email) = ?
      ORDER BY CASE WHEN a.refresh_token IS NOT NULL THEN 0 ELSE 1 END
      LIMIT 1`,
  )
    .bind(ownerEmail)
    .first<StoredGoogleAccount>()
}

export async function getQuorumDriveOwnerEmail(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  return getOwnerEmail(env)
}

export async function hasQuorumDriveOwnerAuthorization(): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true })
  const account = await getStoredAccount(env)
  return !!account?.refreshToken && scopeSet(account.scope).has(GOOGLE_DRIVE_FILE_SCOPE)
}

export async function getQuorumDriveOwnerAccessToken(forceRefresh = false): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const account = await getStoredAccount(env)
  if (!account?.refreshToken || !scopeSet(account.scope).has(GOOGLE_DRIVE_FILE_SCOPE)) {
    throw new Error("Quorum Drive owner has not connected Google Drive")
  }

  if (!forceRefresh && account.accessToken && account.expiresAt && account.expiresAt > Math.floor(Date.now() / 1000) + 300) {
    return account.accessToken
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.AUTH_GOOGLE_ID,
      client_secret: env.AUTH_GOOGLE_SECRET,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) {
    throw new Error(`Failed to refresh Quorum Drive owner token: ${response.status}`)
  }

  const token = (await response.json()) as {
    access_token: string
    expires_in: number
    scope?: string
  }
  if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
    throw new Error("Google returned an invalid Quorum Drive token")
  }
  const expiresAt = Math.floor(Date.now() / 1000) + token.expires_in
  await env.DB.prepare(
    "UPDATE accounts SET access_token = ?, expires_at = ?, scope = COALESCE(?, scope) WHERE id = ?",
  )
    .bind(token.access_token, expiresAt, token.scope ?? null, account.id)
    .run()
  return token.access_token
}
