import { describe, expect, it } from "vitest"
import {
  quorumCorrectionSchema,
  quorumEventKeySchema,
  quorumEventSchema,
  quorumRegistrationSchema,
} from "./quorum"

const validRegistration = {
  name: "Ada Example",
  district: "3",
  homeGroup: "New Hope",
  servicePosition: "gsr" as const,
  positionDetail: "",
  representation: "primary" as const,
  email: "ada@example.test",
  phone: "507-555-0100",
  streetAddress: "123 Main Street",
  city: "Mankato",
  state: "MN",
  zip: "56001",
  newsletterDelivery: "email" as const,
  recaptchaToken: "token",
}

describe("quorum schemas", () => {
  it("requires all contact and mailing fields", () => {
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, phone: "" }).success).toBe(false)
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, streetAddress: "" }).success).toBe(false)
  })

  it("requires a specific office or committee", () => {
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, servicePosition: "area_officer" }).success).toBe(false)
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, servicePosition: "area_officer", positionDetail: "Delegate" }).success).toBe(true)
  })

  it("requires a newsletter delivery choice", () => {
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, newsletterDelivery: undefined }).success).toBe(false)
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, newsletterDelivery: "both" }).success).toBe(true)
  })

  it("uses a direct admin-entered quorum target", () => {
    expect(quorumEventSchema.parse({ title: "Area Committee Meeting", eventDate: "2026-08-08", quorumTarget: "35", featured: true }).quorumTarget).toBe(35)
  })

  it("rejects impossible calendar dates", () => {
    expect(quorumEventSchema.safeParse({ title: "Area Committee Meeting", eventDate: "2026-02-30", quorumTarget: 35, featured: true }).success).toBe(false)
  })

  it("accepts only generated event and submission identifier shapes", () => {
    expect(quorumEventKeySchema.safeParse("MzRa89TL0fXr4f").success).toBe(true)
    expect(quorumEventKeySchema.safeParse("../../other-file").success).toBe(false)
    expect(quorumCorrectionSchema.safeParse({ submissionId: "abcdefghijklmnopqr", action: "exclude", reason: "Duplicate entry" }).success).toBe(true)
    expect(quorumCorrectionSchema.safeParse({ submissionId: "short", action: "exclude", reason: "Duplicate entry" }).success).toBe(false)
  })

  it("requires a bounded reCAPTCHA token", () => {
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, recaptchaToken: "" }).success).toBe(false)
    expect(quorumRegistrationSchema.safeParse({ ...validRegistration, recaptchaToken: "x".repeat(4097) }).success).toBe(false)
  })
})
