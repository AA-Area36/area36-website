import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadEventFlyer } from "@/app/(public)/events/flyer-actions"

type RouteContext = {
  params: Promise<{ eventId: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { eventId } = await params
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
  }

  const result = await uploadEventFlyer(eventId, formData)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
