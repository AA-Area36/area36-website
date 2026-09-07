import { beforeEach, describe, expect, it, vi } from "vitest"
import type { EventSubmissionWithRecurrenceData } from "@/lib/schemas/event"

const {
  batchMock,
  checkRateLimitMock,
  createEventUploadTokenMock,
  existingSubmissionMock,
  getDbMock,
} = vi.hoisted(() => ({
  batchMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  createEventUploadTokenMock: vi.fn(),
  existingSubmissionMock: vi.fn(),
  getDbMock: vi.fn(),
}))

const eventInsertQuery = { kind: "insert-event" }
const typeInsertQuery = { kind: "insert-types" }

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}))

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}))

vi.mock("@/lib/security/upload-token", () => ({
  createEventUploadToken: createEventUploadTokenMock,
}))

import { submitEvent } from "./actions"

const validSubmission: EventSubmissionWithRecurrenceData = {
  title: "Area Workshop",
  date: "2026-08-15",
  startTime: "10:00",
  endTime: "12:00",
  timezone: "America/Chicago",
  locationType: "in-person",
  address: "123 Main St",
  description: "A valid public event submission.",
  types: ["Workshop"],
  submitterEmail: "member@example.com",
  submissionId: "2a207cca-9681-4c75-a1c7-2593617c241b",
  recaptchaToken: "",
  timeTBD: false,
  addressTBD: false,
  meetingLinkTBD: false,
  isRecurring: false,
  recurrenceType: "none",
}

function createDb() {
  let insertCount = 0
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          get: existingSubmissionMock,
        }),
      }),
    }),
    insert: () => ({
      values: () => {
        insertCount++
        return insertCount === 1 ? eventInsertQuery : typeInsertQuery
      },
    }),
    batch: batchMock,
  }
}

describe("submitEvent consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "development")
    checkRateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 2,
      resetAt: Date.now() + 60_000,
      source: "d1",
    })
    existingSubmissionMock.mockResolvedValue(undefined)
    createEventUploadTokenMock.mockResolvedValue("upload-token")
    getDbMock.mockImplementation(async () => createDb())
  })

  it("writes the event and its type rows in one D1 batch", async () => {
    const db = createDb()
    getDbMock.mockResolvedValue(db)

    const result = await submitEvent(validSubmission)

    expect(result).toMatchObject({ success: true, uploadToken: "upload-token" })
    expect(batchMock).toHaveBeenCalledOnce()
    expect(batchMock).toHaveBeenCalledWith([
      eventInsertQuery,
      typeInsertQuery,
    ])
  })

  it("returns the original event for a repeated submission identifier", async () => {
    existingSubmissionMock.mockResolvedValue({
      id: "existing-event",
      submitterEmail: validSubmission.submitterEmail,
    })

    await expect(submitEvent(validSubmission)).resolves.toMatchObject({
      success: true,
      eventId: "existing-event",
    })
    expect(batchMock).not.toHaveBeenCalled()
  })

  it("reports a genuine rate-limit breach as too many submissions", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      source: "d1",
    })

    await expect(submitEvent(validSubmission)).resolves.toEqual({
      success: false,
      error: "Too many submissions. Please try again later.",
    })
    expect(getDbMock).not.toHaveBeenCalled()
  })

  it("does not misreport total limiter failure as user over-submission", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      source: "unavailable",
    })

    await expect(submitEvent(validSubmission)).resolves.toEqual({
      success: false,
      error: "Submission service is temporarily unavailable. Please try again shortly.",
    })
    expect(getDbMock).not.toHaveBeenCalled()
  })
})
