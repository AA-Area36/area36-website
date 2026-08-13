import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getAccessToken } from "@/lib/gdrive/auth"
import {
  createApiErrorResponse,
  createApiRequestId,
  getRedactedErrorMetadata,
} from "@/lib/api/error-response"

type GDriveEnv = {
  GDRIVE_SERVICE_ACCOUNT_EMAIL?: string
  GDRIVE_PRIVATE_KEY?: string
  GDRIVE_PRIVATE_KEY_ID?: string
}

async function getEnv(): Promise<GDriveEnv> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env
  } catch {
    return {
      GDRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
      GDRIVE_PRIVATE_KEY: process.env.GDRIVE_PRIVATE_KEY,
      GDRIVE_PRIVATE_KEY_ID: process.env.GDRIVE_PRIVATE_KEY_ID,
    }
  }
}

export async function GET() {
  const requestId = createApiRequestId()
  const timestamp = new Date().toISOString()
  const headers = {
    "Cache-Control": "no-store",
    "X-Request-Id": requestId,
  }

  try {
    const env = await getEnv()
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_PRIVATE_KEY || !env.GDRIVE_PRIVATE_KEY_ID) {
      return createApiErrorResponse({
        message: "Google Drive is temporarily unavailable.",
        requestId,
        status: 503,
        details: { ok: false, gdrive: false, timestamp },
      })
    }

    const credentials = getGDriveCredentials({
      GDRIVE_SERVICE_ACCOUNT_EMAIL: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
      GDRIVE_PRIVATE_KEY: env.GDRIVE_PRIVATE_KEY,
      GDRIVE_PRIVATE_KEY_ID: env.GDRIVE_PRIVATE_KEY_ID,
    })

    const accessToken = await getAccessToken(credentials)
    const response = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      console.error("GDrive probe failed", {
        requestId,
        upstreamStatus: response.status,
      })
      return createApiErrorResponse({
        message: "Google Drive is temporarily unavailable.",
        requestId,
        status: 503,
        details: { ok: false, gdrive: false, timestamp },
      })
    }

    return NextResponse.json(
      { ok: true, gdrive: true, timestamp },
      { headers }
    )
  } catch (error) {
    console.error("GDrive health check failed", {
      requestId,
      ...getRedactedErrorMetadata(error),
    })
    return createApiErrorResponse({
      message: "Google Drive is temporarily unavailable.",
      requestId,
      status: 503,
      details: { ok: false, gdrive: false, timestamp },
    })
  }
}
