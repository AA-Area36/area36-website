import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { QuorumRegistrationInput } from "@/lib/schemas/quorum"
import type { QuorumEvent } from "@/lib/quorum/types"

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  verifyRecaptcha: vi.fn(),
  getQuorumEventByKey: vi.fn(),
  appendQuorumSubmission: vi.fn(),
  invalidateEdgeCache: vi.fn(),
}))

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}))
vi.mock("@/lib/security/recaptcha", () => ({ verifyRecaptcha: mocks.verifyRecaptcha }))
vi.mock("@/lib/quorum/google", () => ({
  getQuorumEventByKey: mocks.getQuorumEventByKey,
  appendQuorumSubmission: mocks.appendQuorumSubmission,
}))
vi.mock("@/lib/cache/edge-cache", () => ({ invalidateEdgeCache: mocks.invalidateEdgeCache }))

import { submitQuorumRegistration } from "./actions"

const event: QuorumEvent = {
  eventKey: "testEventKey01",
  spreadsheetId: "test-spreadsheet",
  title: "Test Assembly",
  eventDate: "2026-09-05",
  quorumTarget: 10,
  status: "open",
  featured: false,
}
const registration: QuorumRegistrationInput = {
  name: " Test Attendee ",
  district: "3",
  homeGroup: " Test Group ",
  servicePosition: "alt_gsr",
  positionDetail: "",
  representation: "alternate",
  email: "test@example.com",
  phone: "202-555-0100",
  streetAddress: "123 Test Street",
  city: "Example City",
  state: "MN",
  zip: "55000",
  newsletterDelivery: "neither",
  recaptchaToken: "test-verification-token",
}

describe("Quorum check-in side effects", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    mocks.getClientIp.mockResolvedValue("192.0.2.1")
    mocks.checkRateLimit.mockResolvedValue({ ok: true })
    mocks.verifyRecaptcha.mockResolvedValue({ success: true })
    mocks.getQuorumEventByKey.mockResolvedValue(event)
    mocks.appendQuorumSubmission.mockResolvedValue(undefined)
    mocks.invalidateEdgeCache.mockResolvedValue(undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it.each([
    ["invalid event key", "invalid", registration],
    ["invalid registration", event.eventKey, { ...registration, email: "invalid" }],
    ["missing verification token", event.eventKey, { ...registration, recaptchaToken: "" }],
  ])("rejects %s before any external work", async (_label, eventKey, data) => {
    await expect(submitQuorumRegistration(eventKey, data)).resolves.toMatchObject({ success: false })
    expect(mocks.getClientIp).not.toHaveBeenCalled()
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.verifyRecaptcha).not.toHaveBeenCalled()
    expect(mocks.getQuorumEventByKey).not.toHaveBeenCalled()
    expect(mocks.appendQuorumSubmission).not.toHaveBeenCalled()
    expect(mocks.invalidateEdgeCache).not.toHaveBeenCalled()
  })

  it("does not read or append attendance when the limiter denies a request", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false })
    await expect(submitQuorumRegistration(event.eventKey, registration))
      .resolves.toMatchObject({ success: false, error: expect.stringContaining("Too many") })
    expect(mocks.verifyRecaptcha).not.toHaveBeenCalled()
    expect(mocks.getQuorumEventByKey).not.toHaveBeenCalled()
    expect(mocks.appendQuorumSubmission).not.toHaveBeenCalled()
    expect(mocks.invalidateEdgeCache).not.toHaveBeenCalled()
  })

  it("verifies the check-in action and stops before attendance access on rejection", async () => {
    mocks.verifyRecaptcha.mockResolvedValue({ success: false, error: "Verification rejected" })
    await expect(submitQuorumRegistration(event.eventKey, registration))
      .resolves.toEqual({ success: false, error: "Verification rejected" })
    expect(mocks.verifyRecaptcha).toHaveBeenCalledExactlyOnceWith(registration.recaptchaToken, "quorum_check_in")
    expect(mocks.getQuorumEventByKey).not.toHaveBeenCalled()
    expect(mocks.appendQuorumSubmission).not.toHaveBeenCalled()
    expect(mocks.invalidateEdgeCache).not.toHaveBeenCalled()
  })

  it.each([null, { ...event, status: "closed" }])("does not append for an unavailable event: %j", async (unavailable) => {
    mocks.getQuorumEventByKey.mockResolvedValue(unavailable)
    await expect(submitQuorumRegistration(event.eventKey, registration))
      .resolves.toMatchObject({ success: false, error: expect.stringContaining("closed") })
    expect(mocks.appendQuorumSubmission).not.toHaveBeenCalled()
    expect(mocks.invalidateEdgeCache).not.toHaveBeenCalled()
  })

  it("does not write attendance when event lookup fails", async () => {
    mocks.getQuorumEventByKey.mockRejectedValue(new Error("internal upstream detail"))
    const result = await submitQuorumRegistration(event.eventKey, registration)
    expect(result).toMatchObject({ success: false })
    expect(JSON.stringify(result)).not.toContain("internal upstream detail")
    expect(mocks.appendQuorumSubmission).not.toHaveBeenCalled()
    expect(mocks.invalidateEdgeCache).not.toHaveBeenCalled()
  })

  it("returns a generic failure and does not invalidate the cache when the append rejects", async () => {
    mocks.appendQuorumSubmission.mockRejectedValue(new Error("internal sheet detail"))
    const result = await submitQuorumRegistration(event.eventKey, registration)
    expect(result).toMatchObject({ success: false })
    expect(JSON.stringify(result)).not.toContain("internal sheet detail")
    expect(mocks.appendQuorumSubmission).toHaveBeenCalledOnce()
    expect(mocks.invalidateEdgeCache).not.toHaveBeenCalled()
  })

  it("appends one normalized alternate and invalidates only that event summary afterward", async () => {
    await expect(submitQuorumRegistration(event.eventKey, registration)).resolves.toEqual({ success: true })
    expect(mocks.getQuorumEventByKey).toHaveBeenCalledExactlyOnceWith(event.eventKey)
    expect(mocks.appendQuorumSubmission).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      event,
      submissionId: expect.stringMatching(/^[A-Za-z0-9_-]{18}$/),
      submittedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      registration: expect.objectContaining({ name: "Test Attendee", homeGroup: "Test Group" }),
      isAlternate: true,
      seatKey: "gsr:3:test-group",
    }))
    expect(mocks.invalidateEdgeCache).toHaveBeenCalledExactlyOnceWith(`quorum:summary:${event.eventKey}`)
    expect(mocks.appendQuorumSubmission.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.invalidateEdgeCache.mock.invocationCallOrder[0])
  })

  it("keeps saved success if only summary invalidation fails, avoiding a duplicate retry", async () => {
    mocks.invalidateEdgeCache.mockRejectedValue(new Error("test cache unavailable"))
    await expect(submitQuorumRegistration(event.eventKey, registration)).resolves.toMatchObject({ success: true })
    expect(mocks.appendQuorumSubmission).toHaveBeenCalledOnce()
    expect(mocks.invalidateEdgeCache).toHaveBeenCalledOnce()
  })
})
