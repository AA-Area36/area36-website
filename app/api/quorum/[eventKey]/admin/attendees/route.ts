import { NextResponse } from "next/server"
import { createApiErrorResponse, createApiRequestId, getRedactedErrorMetadata } from "@/lib/api/error-response"
import { invalidateEdgeCache } from "@/lib/cache/edge-cache"
import { requireQuorumReadSession, requireQuorumWriteSession } from "@/lib/auth/guards"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { isSameOriginRequest } from "@/lib/security/same-origin"
import { quorumCorrectionSchema } from "@/lib/schemas/quorum"
import { classifyQuorumRows } from "@/lib/quorum/classification"
import { applyQuorumCorrection, getQuorumAdminRows, getQuorumEventByKey } from "@/lib/quorum/google"

type RouteContext = { params: Promise<{ eventKey: string }> }

const noStoreHeaders = (requestId: string) => ({
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Request-Id": requestId,
})

export async function GET(_request: Request, { params }: RouteContext) {
  const requestId = createApiRequestId()
  const session = await requireQuorumReadSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: noStoreHeaders(requestId) })
  }
  const { eventKey } = await params
  try {
    const event = await getQuorumEventByKey(eventKey)
    if (!event) return createApiErrorResponse({ message: "Quorum event not found.", requestId, status: 404 })
    if (event.status === "closed") {
      return NextResponse.json({ closed: true }, { headers: noStoreHeaders(requestId) })
    }
    const rows = classifyQuorumRows(await getQuorumAdminRows(event.spreadsheetId)).rows
    const canEdit = !!(await requireQuorumWriteSession())
    return NextResponse.json(
      { closed: false, canEdit, rows },
      { headers: noStoreHeaders(requestId) },
    )
  } catch (error) {
    console.error("Quorum attendee list failed", { requestId, ...getRedactedErrorMetadata(error) })
    return createApiErrorResponse({ message: "Attendee details are temporarily unavailable.", requestId })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = createApiRequestId()
  const session = await requireQuorumWriteSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: noStoreHeaders(requestId) })
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden", requestId }, { status: 403, headers: noStoreHeaders(requestId) })
  }
  const { eventKey } = await params
  const rateLimit = await checkRateLimit(`quorum-correction:${session.user.email.toLowerCase()}`, {
    limit: 60,
    windowMs: 5 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return createApiErrorResponse({ message: "Too many corrections. Wait a moment and try again.", requestId, status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = quorumCorrectionSchema.safeParse(body)
    if (!parsed.success) {
      return createApiErrorResponse({
        message: parsed.error.errors[0]?.message ?? "Invalid correction.",
        requestId,
        status: 400,
      })
    }
    const event = await getQuorumEventByKey(eventKey)
    if (!event) return createApiErrorResponse({ message: "Quorum event not found.", requestId, status: 404 })
    if (event.status === "closed") {
      return createApiErrorResponse({ message: "Closed events cannot be changed.", requestId, status: 409 })
    }
    await applyQuorumCorrection({
      event,
      ...parsed.data,
      correctedBy: session.user.email,
    })
    await invalidateEdgeCache(`quorum:summary:${eventKey}`)
    return NextResponse.json({ success: true }, { headers: noStoreHeaders(requestId) })
  } catch (error) {
    console.error("Quorum correction failed", { requestId, ...getRedactedErrorMetadata(error) })
    return createApiErrorResponse({ message: "The correction could not be saved.", requestId })
  }
}
