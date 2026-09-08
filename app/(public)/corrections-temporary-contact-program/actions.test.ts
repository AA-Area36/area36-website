import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CorrectionsContactFormData } from "@/lib/schemas/corrections-tcp"

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getCloudflareContext: vi.fn(),
  getGmailCredentials: vi.fn(),
  sendEmail: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  verifyRecaptcha: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.getCloudflareContext }))
vi.mock("@/lib/gmail/client", () => ({
  getGmailCredentials: mocks.getGmailCredentials,
  sendEmail: mocks.sendEmail,
}))
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}))
vi.mock("@/lib/security/recaptcha", () => ({ verifyRecaptcha: mocks.verifyRecaptcha }))

import { submitCorrectionsContactForm } from "./actions"

const validSubmission: CorrectionsContactFormData = {
  firstName: " Test ",
  lastName: " Volunteer ",
  gender: "Female",
  city: " Example City ",
  email: "Volunteer@EXAMPLE.COM",
  sobrietyDate: "2000-01-01",
  birthYear: "1980",
  isSpanishSpeaking: false,
  recaptchaToken: "test-verification-token",
}

function createDatabaseMock() {
  const get = vi.fn().mockResolvedValue(undefined)
  const values = vi.fn().mockResolvedValue(undefined)
  const db = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ get }) }),
    }),
    insert: vi.fn().mockReturnValue({ values }),
    update: vi.fn(),
  }
  return { db, get, values }
}

describe("Corrections volunteer submission side effects", () => {
  let database: ReturnType<typeof createDatabaseMock>

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    database = createDatabaseMock()
    mocks.getDb.mockResolvedValue(database.db)
    mocks.getClientIp.mockResolvedValue("192.0.2.1")
    mocks.checkRateLimit.mockResolvedValue({ ok: true })
    mocks.verifyRecaptcha.mockResolvedValue({ success: true })
    mocks.getCloudflareContext.mockResolvedValue({ env: {} })
    mocks.getGmailCredentials.mockReturnValue({})
    mocks.sendEmail.mockResolvedValue({ success: true })
  })

  afterEach(() => vi.restoreAllMocks())

  it("rejects invalid data before verification, database access or email", async () => {
    await expect(submitCorrectionsContactForm({ ...validSubmission, email: "invalid" }))
      .resolves.toMatchObject({ success: false })
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.verifyRecaptcha).not.toHaveBeenCalled()
    expect(mocks.getDb).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("does not verify or persist a rate-limited request", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false })
    await expect(submitCorrectionsContactForm(validSubmission))
      .resolves.toMatchObject({ success: false, error: expect.stringContaining("Too many") })
    expect(mocks.verifyRecaptcha).not.toHaveBeenCalled()
    expect(mocks.getDb).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("requires the Corrections reCAPTCHA action before accessing the database", async () => {
    mocks.verifyRecaptcha.mockResolvedValue({ success: false, error: "Verification rejected" })
    await expect(submitCorrectionsContactForm(validSubmission))
      .resolves.toEqual({ success: false, error: "Verification rejected" })
    expect(mocks.verifyRecaptcha).toHaveBeenCalledExactlyOnceWith(
      validSubmission.recaptchaToken, "corrections_volunteer_form",
    )
    expect(mocks.getDb).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("preserves an existing volunteer and sends no notification for an anonymous duplicate", async () => {
    database.get.mockResolvedValue({ id: "existing-test-contact" })
    await expect(submitCorrectionsContactForm({ ...validSubmission, notes: "Unverified replacement" }))
      .resolves.toMatchObject({ success: true, message: expect.stringContaining("kept") })
    expect(database.db.insert).not.toHaveBeenCalled()
    expect(database.db.update).not.toHaveBeenCalled()
    expect(mocks.getCloudflareContext).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("inserts one normalized contact before sending one coordinator notification", async () => {
    await expect(submitCorrectionsContactForm(validSubmission))
      .resolves.toMatchObject({ success: true, message: expect.stringContaining("notified") })
    expect(database.db.insert).toHaveBeenCalledOnce()
    expect(database.values).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      id: expect.any(String),
      firstName: "Test",
      lastName: "Volunteer",
      city: "Example City",
      emailNormalized: "volunteer@example.com",
      birthYear: 1980,
      active: true,
    }))
    expect(database.db.update).not.toHaveBeenCalled()
    expect(mocks.sendEmail).toHaveBeenCalledExactlyOnceWith({}, expect.objectContaining({
      replyTo: validSubmission.email,
      subject: expect.stringContaining("Volunteer"),
    }))
    expect(database.values.mock.invocationCallOrder[0]).toBeLessThan(mocks.sendEmail.mock.invocationCallOrder[0])
  })

  it("does not notify when the contact insert fails and returns a generic error", async () => {
    database.values.mockRejectedValue(new Error("internal storage detail"))
    const result = await submitCorrectionsContactForm(validSubmission)
    expect(result).toMatchObject({ success: false })
    expect(JSON.stringify(result)).not.toContain("internal storage detail")
    expect(database.values).toHaveBeenCalledOnce()
    expect(mocks.getCloudflareContext).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each(["rejected result", "thrown error"])(
    "keeps saved success when notification fails with a %s",
    async (failure) => {
      if (failure === "rejected result") {
        mocks.sendEmail.mockResolvedValue({ success: false, error: "test mail failure" })
      } else {
        mocks.sendEmail.mockRejectedValue(new Error("test mail failure"))
      }
      const result = await submitCorrectionsContactForm(validSubmission)
      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining("saved, but"),
      })
      expect(result.message).toContain("do not need to submit again")
      expect(database.values).toHaveBeenCalledOnce()
      expect(mocks.sendEmail).toHaveBeenCalledOnce()
    },
  )
})
