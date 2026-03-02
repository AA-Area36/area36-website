import { NextRequest, NextResponse } from "next/server"
import {
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
} from "@/lib/files/access"

// Use nodejs runtime for compatibility with Cloudflare Workers via OpenNext
export const runtime = "nodejs"

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function hasFileExtension(name: string): boolean {
  return /\.[a-z0-9]{1,10}$/i.test(name.trim())
}

function extFromContentType(contentType: string | null): string | null {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase()
  switch (mime) {
    case "application/pdf":
      return "pdf"
    case "application/zip":
      return "zip"
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "text/plain":
      return "txt"
    case "text/csv":
      return "csv"
    default:
      return null
  }
}

async function resolveAccess(
  request: NextRequest,
  fileId: string,
  requestId: string
): Promise<
  | {
      credentials: Awaited<ReturnType<typeof getGDriveCredentials>>
      filename?: string
    }
  | { errorResponse: NextResponse }
> {
  const env = await getGDriveEnv()

  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
    console.error("[api/files/download] drive not configured", { requestId, fileId })
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
  const { valid, filename, requiresPassword } = await validateFileAccess(
    fileId,
    credentials,
    unlockToken
  )

  if (!valid) {
    if (requiresPassword) {
      console.warn("[api/files/download] password required", { requestId, fileId })
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
    console.warn("[api/files/download] access denied", { requestId, fileId })
    return {
      errorResponse: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    }
  }

  return { credentials, filename }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const requestId = createRequestId()

  if (!fileId) {
    console.warn("[api/files/download] HEAD missing file id", { requestId })
    return new NextResponse(null, { status: 400 })
  }

  try {
    const hasUnlockToken = request.nextUrl.searchParams.has("unlock")
    console.info("[api/files/download] HEAD start", { requestId, fileId, hasUnlockToken })

    const access = await resolveAccess(request, fileId, requestId)
    if ("errorResponse" in access) {
      return new NextResponse(null, {
        status: access.errorResponse.status,
        headers: access.errorResponse.headers,
      })
    }

    console.info("[api/files/download] HEAD success", { requestId, fileId })
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error) {
    console.error("[api/files/download] HEAD unhandled error", {
      requestId,
      fileId,
      error: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse(null, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const requestId = createRequestId()

  if (!fileId) {
    console.warn("[api/files/download] missing file id", { requestId })
    return NextResponse.json({ error: "File ID required" }, { status: 400 })
  }

  try {
    const hasUnlockToken = request.nextUrl.searchParams.has("unlock")
    console.info("[api/files/download] start", { requestId, fileId, hasUnlockToken })

    const access = await resolveAccess(request, fileId, requestId)
    if ("errorResponse" in access) {
      return access.errorResponse
    }

    // Get access token for Google Drive API - dynamic import to reduce bundle size
    const { getAccessToken } = await import("@/lib/gdrive/auth")
    const accessToken = await getAccessToken(access.credentials)

    // Fetch file content from Google Drive
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    const driveResponse = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!driveResponse.ok) {
      console.error(
        "[api/files/download] drive api error",
        {
          requestId,
          fileId,
          status: driveResponse.status,
          body: await driveResponse.text(),
        }
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
    let safeFilename = (access.filename || "file")
      .replace(/[^\w\s.-]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "")
    if (!safeFilename) safeFilename = "file"

    if (!hasFileExtension(safeFilename)) {
      const ext = extFromContentType(contentType)
      if (ext) safeFilename = `${safeFilename}.${ext}`
    }

    responseHeaders.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    )

    console.info("[api/files/download] success", {
      requestId,
      fileId,
      contentType,
      contentLength,
      filename: safeFilename,
    })

    return new NextResponse(driveResponse.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("[api/files/download] unhandled error", {
      requestId,
      fileId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
