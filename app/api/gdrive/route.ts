import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getGDriveCredentials } from "@/lib/gdrive/client"
import { getAccessToken } from "@/lib/gdrive/auth"

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
  const timestamp = new Date().toISOString()
  const headers = { "Cache-Control": "no-store" }

  try {
    const env = await getEnv()
    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_PRIVATE_KEY || !env.GDRIVE_PRIVATE_KEY_ID) {
      return NextResponse.json(
        { ok: false, gdrive: false, error: "GDrive credentials not configured", timestamp },
        { status: 503, headers }
      )
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
      return NextResponse.json(
        { ok: false, gdrive: false, error: `GDrive probe failed (${response.status})`, timestamp },
        { status: 503, headers }
      )
    }

    return NextResponse.json(
      { ok: true, gdrive: true, timestamp },
      { headers }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        gdrive: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp,
      },
      { status: 503, headers }
    )
  }
}
