"use server"

import { nanoid } from "nanoid"
import { quorumEventKeySchema, quorumRegistrationSchema, type QuorumRegistrationInput } from "@/lib/schemas/quorum"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"
import { verifyRecaptcha } from "@/lib/security/recaptcha"
import { buildQuorumSeatKey } from "@/lib/quorum/classification"
import { appendQuorumSubmission, getQuorumEventByKey } from "@/lib/quorum/google"
import { invalidateEdgeCache } from "@/lib/cache/edge-cache"
import { getRedactedErrorMetadata } from "@/lib/api/error-response"

export async function submitQuorumRegistration(eventKey: string, data: QuorumRegistrationInput) {
  const parsedEventKey = quorumEventKeySchema.safeParse(eventKey)
  if (!parsedEventKey.success) {
    return { success: false as const, error: "Check-in for this event is unavailable." }
  }
  const parsed = quorumRegistrationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Check the form and try again." }
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`quorum-submit:${parsedEventKey.data}:${ip}`, {
    limit: 60,
    windowMs: 5 * 60 * 1000,
  })
  if (!rateLimit.ok) {
    return { success: false as const, error: "Too many check-ins were received from this network. Ask an administrator for help." }
  }

  const recaptcha = await verifyRecaptcha(parsed.data.recaptchaToken, "quorum_check_in")
  if (!recaptcha.success) return { success: false as const, error: recaptcha.error }

  try {
    const event = await getQuorumEventByKey(parsedEventKey.data)
    if (!event || event.status !== "open") {
      return { success: false as const, error: "Check-in for this event is closed." }
    }
    const isAlternate =
      parsed.data.servicePosition === "alt_gsr" ||
      parsed.data.servicePosition === "alt_dcm" ||
      ((parsed.data.servicePosition === "area_officer" ||
        parsed.data.servicePosition === "area_committee_chair") &&
        parsed.data.representation === "alternate")
    const seatKey = buildQuorumSeatKey(parsed.data)
    await appendQuorumSubmission({
      event,
      submissionId: nanoid(18),
      submittedAt: new Date().toISOString(),
      registration: parsed.data,
      isAlternate,
      seatKey,
    })
    await invalidateEdgeCache(`quorum:summary:${parsedEventKey.data}`)
    return { success: true as const }
  } catch (error) {
    console.error("Quorum check-in failed", getRedactedErrorMetadata(error))
    return { success: false as const, error: "We could not save your check-in. Please try again." }
  }
}
