import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getImage } from "@/lib/r2"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  // Only authenticated admins can view images
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { key } = await params
  const imageKey = key.join("/")

  if (!imageKey) {
    return NextResponse.json({ error: "No image key provided" }, { status: 400 })
  }

  const image = await getImage(imageKey)

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }

  const headers = new Headers()
  headers.set("Content-Type", image.httpMetadata?.contentType || "image/jpeg")
  headers.set("Cache-Control", "private, max-age=3600")

  return new NextResponse(image.body, {
    status: 200,
    headers,
  })
}
