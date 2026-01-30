import { NextRequest, NextResponse } from "next/server"
import {
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
} from "@/lib/files/access"
import { getPreviewUrl } from "@/lib/gdrive/client"

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
    const { valid, requiresPassword } = await validateFileAccess(
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

    // Return the Google Drive preview URL for embedding
    // The client will use this URL in an iframe
    const previewUrl = getPreviewUrl(fileId)

    return NextResponse.json({ previewUrl })
  } catch (error) {
    console.error("Error getting preview URL:", error)
    return NextResponse.json({ error: "Preview failed" }, { status: 500 })
  }
}
