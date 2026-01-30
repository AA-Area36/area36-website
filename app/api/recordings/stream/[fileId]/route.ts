import { NextRequest, NextResponse } from "next/server"
import { getAccessToken } from "@/lib/gdrive/auth"
import {
  validateRecordingAccess,
  getGDriveEnv,
  getGDriveCredentials,
} from "@/lib/recordings/access"

// Use nodejs runtime for better compatibility with Cloudflare Workers via OpenNext
// Edge runtime causes token caching issues and CPU limit problems
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

    // Validate user has access to this file's folder
    const { valid } = await validateRecordingAccess(fileId, credentials)
    if (!valid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get access token for Google Drive API
    const accessToken = await getAccessToken(credentials)

    // Fetch file content from Google Drive
    // Use alt=media to get the actual file content
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    // Forward range header for seeking support
    const rangeHeader = request.headers.get("range")
    const headers: HeadersInit = {
      Authorization: `Bearer ${accessToken}`,
    }
    if (rangeHeader) {
      headers["Range"] = rangeHeader
    }

    const driveResponse = await fetch(driveUrl, { headers })

    if (!driveResponse.ok) {
      console.error(
        "Drive API error:",
        driveResponse.status,
        await driveResponse.text()
      )
      return NextResponse.json(
        { error: "Failed to fetch audio" },
        { status: driveResponse.status }
      )
    }

    // Build response headers
    const responseHeaders = new Headers()

    // Pass through content headers
    const contentType = driveResponse.headers.get("content-type")
    if (contentType) {
      responseHeaders.set("Content-Type", contentType)
    } else {
      // Default to audio/mpeg for MP3 files
      responseHeaders.set("Content-Type", "audio/mpeg")
    }

    const contentLength = driveResponse.headers.get("content-length")
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength)
    }

    const contentRange = driveResponse.headers.get("content-range")
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange)
    }

    // Set accept-ranges to enable seeking
    responseHeaders.set("Accept-Ranges", "bytes")

    // Cache for 1 hour (audio files don't change often)
    responseHeaders.set("Cache-Control", "private, max-age=3600")

    // Return the stream
    return new NextResponse(driveResponse.body, {
      status: driveResponse.status, // Will be 206 for range requests
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Error streaming audio:", error)
    return NextResponse.json({ error: "Stream failed" }, { status: 500 })
  }
}
