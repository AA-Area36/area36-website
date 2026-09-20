import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
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

    return NextResponse.json(
      { ok: true, configured: true, check: "configuration", timestamp },
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
