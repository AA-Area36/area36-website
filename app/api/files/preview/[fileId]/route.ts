import { NextRequest, NextResponse } from "next/server"
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

    const credentials = await getGDriveCredentials(env)

    // Extract unlock token from query string (used for immediate post-
    // password-entry requests before the cookie has propagated).
    const unlockToken = request.nextUrl.searchParams.get("unlock")
    console.log("[preview-route] fileId:", fileId, "| unlockToken present:", !!unlockToken, "| full URL:", request.nextUrl.toString())

    // Validate access
    const { valid, requiresPassword } = await validateFileAccess(
      fileId,
      credentials,
      unlockToken
    )
    console.log("[preview-route] validateFileAccess result:", { valid, requiresPassword })

    if (!valid) {
      if (requiresPassword) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Stream the actual file content through the server so the browser never
    // contacts drive.google.com directly (which would 403 for restricted files).
    const { getAccessToken } = await import("@/lib/gdrive/auth")
    const accessToken = await getAccessToken(credentials)

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    const driveResponse = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!driveResponse.ok) {
      console.error(
        "Drive API preview error:",
        driveResponse.status,
        await driveResponse.text()
      )
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: driveResponse.status }
      )
    }

    const responseHeaders = new Headers()

    const contentType = driveResponse.headers.get("content-type")
    responseHeaders.set("Content-Type", contentType || "application/pdf")

    const contentLength = driveResponse.headers.get("content-length")
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength)
    }

    // Inline disposition so the browser renders it (for iframe embedding)
    responseHeaders.set("Content-Disposition", "inline")

    // Allow caching for preview content
    responseHeaders.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    )

    return new NextResponse(driveResponse.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Error getting preview:", error)
    return NextResponse.json({ error: "Preview failed" }, { status: 500 })
  }
}
