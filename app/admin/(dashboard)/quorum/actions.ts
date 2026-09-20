"use server"

import { revalidatePath } from "next/cache"
import { signIn } from "@/lib/auth"
import { requireQuorumWriteSession } from "@/lib/auth/guards"
import { invalidateEdgeCache } from "@/lib/cache/edge-cache"
import { getRedactedErrorMetadata } from "@/lib/api/error-response"
import { quorumEventKeySchema, quorumEventSchema, type QuorumEventInput } from "@/lib/schemas/quorum"
import {
  closeQuorumEvent,
  createQuorumEvent,
  setQuorumEventFeatured,
} from "@/lib/quorum/google"
import { GOOGLE_DRIVE_FILE_SCOPE, getQuorumDriveOwnerEmail } from "@/lib/google/user-drive-auth"

async function requireWriter() {
  const session = await requireQuorumWriteSession()
  if (!session) throw new Error("Unauthorized")
  return session
}

export async function connectQuorumDriveAction() {
  await requireWriter()
  const ownerEmail = await getQuorumDriveOwnerEmail()
  await signIn(
    "google",
    { redirectTo: "/admin/quorum" },
    {
      access_type: "offline",
      include_granted_scopes: "true",
      login_hint: ownerEmail,
      prompt: "consent",
      scope: `openid email profile ${GOOGLE_DRIVE_FILE_SCOPE}`,
    },
  )
}

export async function createQuorumEventAction(data: QuorumEventInput, eventKey: string) {
  await requireWriter()
  const parsed = quorumEventSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Invalid event." }
  }
  try {
    const event = await createQuorumEvent({ ...parsed.data, eventKey: quorumEventKeySchema.parse(eventKey) })
    let warning: string | undefined
    try {
      if (parsed.data.featured) await setQuorumEventFeatured(event.eventKey)
      await Promise.all([
        invalidateEdgeCache("quorum:featured"),
        invalidateEdgeCache(`quorum:summary:${event.eventKey}`),
      ])
      revalidatePath("/admin/quorum")
    } catch {
      warning = "The event was created. Featured selection or page refresh did not complete; refresh and select the event below. Do not create it again."
    }
    return { success: true as const, eventKey: event.eventKey, warning }
  } catch (error) {
    console.error("Failed to create quorum event", getRedactedErrorMetadata(error))
    return { success: false as const, error: `Creation could not be confirmed. Retry this same form. If it remains unavailable, ask an administrator to reconcile attempt ${quorumEventKeySchema.safeParse(eventKey).success ? eventKey : "(invalid key)"} in Quorum Drive before creating another event.` }
  }
}

export async function featureQuorumEventAction(eventKey: string) {
  await requireWriter()
  const parsedEventKey = quorumEventKeySchema.parse(eventKey)
  await setQuorumEventFeatured(parsedEventKey)
  await invalidateEdgeCache("quorum:featured")
  revalidatePath("/admin/quorum")
}

export async function closeQuorumEventAction(eventKey: string) {
  await requireWriter()
  const parsedEventKey = quorumEventKeySchema.parse(eventKey)
  await closeQuorumEvent(parsedEventKey)
  await Promise.all([
    invalidateEdgeCache("quorum:featured"),
    invalidateEdgeCache(`quorum:summary:${parsedEventKey}`),
  ])
  revalidatePath("/admin/quorum")
}
