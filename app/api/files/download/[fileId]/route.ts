import { NextRequest, NextResponse } from "next/server"
import { getAccessToken } from "@/lib/gdrive/auth"
import {
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
} from "@/lib/files/access"

// Use nodejs runtime for compatibility with Cloudflare Workers via OpenNext
export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!fileId) {
    return NextResponse.json({ error: "File ID required" }, { status: 400 })
  }

  try {
    const env = await getGDriveEnv()

    if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
      return NextResponse.json(
        { error: "Drive not configured" },
        { status: 500 }
      )
    }

    const credentials = getGDriveCredentials(env)

    // Validate access
    const { valid, filename, requiresPassword } = await validateFileAccess(
      fileId,
      credentials
    )

    if (!valid) {
      if (requiresPassword) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get access token for Google Drive API
    const accessToken = await getAccessToken(credentials)

    // Fetch file content from Google Drive
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    const driveResponse = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!driveResponse.ok) {
      console.error(
        "Drive API error:",
        driveResponse.status,
        await driveResponse.text()
      )
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: driveResponse.status }
      )
    }

    // Build response headers
    const responseHeaders = new Headers()

    const contentType = driveResponse.headers.get("content-type")
    if (contentType) {
      responseHeaders.set("Content-Type", contentType)
    } else {
      responseHeaders.set("Content-Type", "application/octet-stream")
    }

    const contentLength = driveResponse.headers.get("content-length")
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength)
    }

    // Set Content-Disposition for download with original filename
    const safeFilename = (filename || "file")
      .replace(/[^\w\s.-]/g, "_")
      .replace(/\s+/g, "_")
    responseHeaders.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    )

    return new NextResponse(driveResponse.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
