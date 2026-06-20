import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { eventFlyers, events } from "@/lib/db/schema"
import { uploadFlyer } from "@/lib/r2"
import { invalidateEventCaches } from "@/lib/utils/event-cache"

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

  const db = await getDb()
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
  }

  const uploadResult = await uploadFlyer(eventId, file)
  if (!uploadResult.success) {
    return NextResponse.json({ success: false, error: uploadResult.error }, { status: 400 })
  }

  const existingFlyers = await db.select().from(eventFlyers).where(eq(eventFlyers.eventId, eventId))
  const maxOrder = existingFlyers.reduce((max, flyer) => Math.max(max, flyer.order), -1)
  const flyerId = crypto.randomUUID()

  await db.insert(eventFlyers).values({
    id: flyerId,
    eventId,
    fileKey: uploadResult.key,
    fileName: uploadResult.fileName,
    fileType: uploadResult.fileType,
    fileSize: uploadResult.fileSize,
    order: maxOrder + 1,
  })

  revalidatePath("/events")
  revalidatePath("/admin/events")
  await invalidateEventCaches(event.districtNumber)

  return NextResponse.json({
    success: true,
    flyer: {
      id: flyerId,
      fileKey: uploadResult.key,
      fileName: uploadResult.fileName,
      fileType: uploadResult.fileType,
      fileSize: uploadResult.fileSize,
    },
  })
}
