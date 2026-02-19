import { NextRequest, NextResponse } from "next/server"
import {
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
} from "@/lib/files/access"

// Use nodejs runtime for compatibility with Cloudflare Workers via OpenNext
export const runtime = "nodejs"

async function resolveAccess(
  request: NextRequest,
  fileId: string
): Promise<{
  credentials: Awaited<ReturnType<typeof getGDriveCredentials>>
} | {
  errorResponse: NextResponse
}> {
  const env = await getGDriveEnv()

  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
    return {
      errorResponse: NextResponse.json(
        { error: "Drive not configured" },
        { status: 500 }
      ),
    }
  }

  const credentials = await getGDriveCredentials(env)

  // Extract unlock token from query string (used for immediate post-
  // password-entry requests before the cookie has propagated).
  const unlockToken = request.nextUrl.searchParams.get("unlock")

  // Validate access
  const { valid, requiresPassword } = await validateFileAccess(
    fileId,
    credentials,
    unlockToken
  )

  if (!valid) {
    if (requiresPassword) {
      return {
        errorResponse: NextResponse.json(
          { error: "Password required", requiresPassword: true },
          {
            status: 403,
            headers: { "x-requires-password": "1" },
          }
        ),
      }
    }
    return {
      errorResponse: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    }
  }

  return { credentials }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!fileId) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const access = await resolveAccess(request, fileId)
    if ("errorResponse" in access) {
      return new NextResponse(null, {
        status: access.errorResponse.status,
        headers: access.errorResponse.headers,
      })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error) {
    console.error("Error checking preview access:", error)
    return new NextResponse(null, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!fileId) {
    return NextResponse.json({ error: "File ID required" }, { status: 400 })
  }

  try {
    const access = await resolveAccess(request, fileId)
    if ("errorResponse" in access) {
      return access.errorResponse
    }

    // Stream the actual file content through the server so the browser never
    // contacts drive.google.com directly (which would 403 for restricted files).
    const { getAccessToken } = await import("@/lib/gdrive/auth")
    const accessToken = await getAccessToken(access.credentials)

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    const requestHeaders = new Headers({
      Authorization: `Bearer ${accessToken}`,
    })
    const range = request.headers.get("range")
    if (range) {
      requestHeaders.set("Range", range)
    }

    const driveResponse = await fetch(driveUrl, {
      headers: requestHeaders,
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
    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]
    for (const headerName of passthroughHeaders) {
      const value = driveResponse.headers.get(headerName)
      if (value) {
        responseHeaders.set(headerName, value)
      }
    }
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/pdf")
    }

    // Inline disposition so the browser renders it (for iframe embedding)
    responseHeaders.set("Content-Disposition", "inline")

    // Allow caching for preview content
    responseHeaders.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    )

    return new NextResponse(driveResponse.body, {
      status: driveResponse.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Error getting preview:", error)
    return NextResponse.json({ error: "Preview failed" }, { status: 500 })
  }
}
