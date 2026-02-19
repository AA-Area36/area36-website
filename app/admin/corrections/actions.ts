"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireCorrectionsWriteSession } from "@/lib/auth/guards"
import { getDb } from "@/lib/db"
import {
  correctionsContacts,
  correctionsMatches,
  correctionsRecipients,
  type CorrectionsRecipientStatus,
} from "@/lib/db/schema"
import { RECIPIENT_STATUS_OPTIONS } from "@/lib/corrections/options"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseRequiredText(value: unknown, field: string, maxLength = 300): string {
  const parsed = String(value ?? "").trim()
  if (!parsed) throw new Error(`${field} is required`)
  if (parsed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer`)
  return parsed
}

function parseOptionalText(value: unknown, maxLength = 300): string | null {
  const parsed = String(value ?? "").trim()
  if (!parsed) return null
  if (parsed.length > maxLength) throw new Error(`Value must be ${maxLength} characters or fewer`)
  return parsed
}

function parseOptionalEmail(value: unknown): { email: string | null; normalized: string | null } {
  const parsed = String(value ?? "").trim()
  if (!parsed) return { email: null, normalized: null }
  const normalized = normalizeEmail(parsed)
  if (!EMAIL_REGEX.test(normalized)) throw new Error("Email is invalid")
  return { email: parsed, normalized }
}

function parseOptionalYear(value: unknown): number | null {
  const parsed = String(value ?? "").trim()
  if (!parsed) return null
  if (!/^\d{4}$/.test(parsed)) throw new Error("Birth year must be 4 digits")
  const year = Number(parsed)
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error("Birth year is invalid")
  return year
}

function parseStatus(value: unknown): CorrectionsRecipientStatus {
  const parsed = String(value ?? "").trim()
  if (!RECIPIENT_STATUS_OPTIONS.includes(parsed as CorrectionsRecipientStatus)) {
    throw new Error("Status is invalid")
  }
  return parsed as CorrectionsRecipientStatus
}

function boolFromForm(value: unknown): boolean {
  const parsed = String(value ?? "").trim().toLowerCase()
  return parsed === "on" || parsed === "true" || parsed === "1"
}

export async function createCorrectionsContact(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const firstName = parseRequiredText(formData.get("firstName"), "First name", 120)
  const lastName = parseRequiredText(formData.get("lastName"), "Last name", 120)
  const gender = parseRequiredText(formData.get("gender"), "Gender", 40)
  const city = parseRequiredText(formData.get("city"), "City", 120)
  const homeGroup = parseOptionalText(formData.get("homeGroup"), 200)
  const sobrietyDate = parseOptionalText(formData.get("sobrietyDate"), 20)

  const { email, normalized } = parseOptionalEmail(formData.get("email"))

  const db = await getDb()
  await db.insert(correctionsContacts).values({
    id: crypto.randomUUID(),
    firstName,
    lastName,
    gender,
    streetAddress: parseOptionalText(formData.get("streetAddress"), 300),
    city,
    county: parseOptionalText(formData.get("county"), 120),
    state: parseOptionalText(formData.get("state"), 120),
    zipCode: parseOptionalText(formData.get("zipCode"), 20),
    email,
    emailNormalized: normalized,
    sobrietyDate,
    phonePrimary: parseOptionalText(formData.get("phonePrimary"), 40),
    phoneSecondary: parseOptionalText(formData.get("phoneSecondary"), 40),
    birthYear: parseOptionalYear(formData.get("birthYear")),
    isSpanishSpeaking: boolFromForm(formData.get("isSpanishSpeaking")),
    otherLanguages: parseOptionalText(formData.get("otherLanguages"), 300),
    homeGroup,
    notes: parseOptionalText(formData.get("notes"), 4000),
    active: boolFromForm(formData.get("active") ?? "on"),
  })

  revalidatePath("/admin/corrections")
}

export async function updateCorrectionsContact(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = parseRequiredText(formData.get("id"), "Contact id", 120)
  const firstName = parseRequiredText(formData.get("firstName"), "First name", 120)
  const lastName = parseRequiredText(formData.get("lastName"), "Last name", 120)
  const gender = parseRequiredText(formData.get("gender"), "Gender", 40)
  const city = parseRequiredText(formData.get("city"), "City", 120)
  const homeGroup = parseOptionalText(formData.get("homeGroup"), 200)
  const sobrietyDate = parseOptionalText(formData.get("sobrietyDate"), 20)

  const { email, normalized } = parseOptionalEmail(formData.get("email"))

  const db = await getDb()
  await db
    .update(correctionsContacts)
    .set({
      firstName,
      lastName,
      gender,
      streetAddress: parseOptionalText(formData.get("streetAddress"), 300),
      city,
      county: parseOptionalText(formData.get("county"), 120),
      state: parseOptionalText(formData.get("state"), 120),
      zipCode: parseOptionalText(formData.get("zipCode"), 20),
      email,
      emailNormalized: normalized,
      sobrietyDate,
      phonePrimary: parseOptionalText(formData.get("phonePrimary"), 40),
      phoneSecondary: parseOptionalText(formData.get("phoneSecondary"), 40),
      birthYear: parseOptionalYear(formData.get("birthYear")),
      isSpanishSpeaking: boolFromForm(formData.get("isSpanishSpeaking")),
      otherLanguages: parseOptionalText(formData.get("otherLanguages"), 300),
      homeGroup,
      notes: parseOptionalText(formData.get("notes"), 4000),
      active: boolFromForm(formData.get("active")),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(correctionsContacts.id, id))

  revalidatePath("/admin/corrections")
}

export async function createCorrectionsRecipient(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const firstName = parseRequiredText(formData.get("firstName"), "First name", 120)
  const lastName = parseRequiredText(formData.get("lastName"), "Last name", 120)
  const idNumber = parseRequiredText(formData.get("idNumber"), "ID number", 120)
  const gender = parseRequiredText(formData.get("gender"), "Gender", 40)
  const facilityName = parseRequiredText(formData.get("facilityName"), "Facility", 200)
  const source = parseRequiredText(formData.get("source"), "Source", 200)

  const db = await getDb()
  await db.insert(correctionsRecipients).values({
    id: crypto.randomUUID(),
    firstName,
    lastName,
    idNumber,
    gender,
    birthYear: parseOptionalYear(formData.get("birthYear")),
    dischargeDate: parseOptionalText(formData.get("dischargeDate"), 20),
    phone: parseOptionalText(formData.get("phone"), 40),
    facilityName,
    source,
    contactEmail: parseOptionalEmail(formData.get("contactEmail")).email,
    releaseAddress: parseOptionalText(formData.get("releaseAddress"), 300),
    releaseCity: parseOptionalText(formData.get("releaseCity"), 120),
    releaseCounty: parseOptionalText(formData.get("releaseCounty"), 120),
    releaseState: parseOptionalText(formData.get("releaseState"), 120),
    releaseZip: parseOptionalText(formData.get("releaseZip"), 20),
    notes: parseOptionalText(formData.get("notes"), 4000),
    status: parseStatus(formData.get("status") || "unmatched"),
  })

  revalidatePath("/admin/corrections")
}

export async function updateCorrectionsRecipient(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const id = parseRequiredText(formData.get("id"), "Recipient id", 120)
  const firstName = parseRequiredText(formData.get("firstName"), "First name", 120)
  const lastName = parseRequiredText(formData.get("lastName"), "Last name", 120)
  const idNumber = parseRequiredText(formData.get("idNumber"), "ID number", 120)
  const gender = parseRequiredText(formData.get("gender"), "Gender", 40)
  const facilityName = parseRequiredText(formData.get("facilityName"), "Facility", 200)
  const source = parseRequiredText(formData.get("source"), "Source", 200)

  const db = await getDb()
  await db
    .update(correctionsRecipients)
    .set({
      firstName,
      lastName,
      idNumber,
      gender,
      birthYear: parseOptionalYear(formData.get("birthYear")),
      dischargeDate: parseOptionalText(formData.get("dischargeDate"), 20),
      phone: parseOptionalText(formData.get("phone"), 40),
      facilityName,
      source,
      contactEmail: parseOptionalEmail(formData.get("contactEmail")).email,
      releaseAddress: parseOptionalText(formData.get("releaseAddress"), 300),
      releaseCity: parseOptionalText(formData.get("releaseCity"), 120),
      releaseCounty: parseOptionalText(formData.get("releaseCounty"), 120),
      releaseState: parseOptionalText(formData.get("releaseState"), 120),
      releaseZip: parseOptionalText(formData.get("releaseZip"), 20),
      notes: parseOptionalText(formData.get("notes"), 4000),
      status: parseStatus(formData.get("status") || "unmatched"),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(correctionsRecipients.id, id))

  revalidatePath("/admin/corrections")
}

export async function matchRecipientToContact(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email || !session.user.id) throw new Error("Unauthorized")

  const recipientId = parseRequiredText(formData.get("recipientId"), "Recipient id", 120)
  const contactId = parseRequiredText(formData.get("contactId"), "Contact id", 120)

  const db = await getDb()

  await db
    .update(correctionsMatches)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(correctionsMatches.recipientId, recipientId), eq(correctionsMatches.isActive, true)))

  await db.insert(correctionsMatches).values({
    id: crypto.randomUUID(),
    recipientId,
    contactId,
    isActive: true,
    matchedByUserId: session.user.id,
  })

  await db
    .update(correctionsRecipients)
    .set({
      status: "pending",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(correctionsRecipients.id, recipientId))

  revalidatePath("/admin/corrections")
}

export async function markRecipientCompleted(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const recipientId = parseRequiredText(formData.get("recipientId"), "Recipient id", 120)
  const now = new Date().toISOString()
  const db = await getDb()

  await db
    .update(correctionsRecipients)
    .set({ status: "completed", updatedAt: now })
    .where(eq(correctionsRecipients.id, recipientId))

  await db
    .update(correctionsMatches)
    .set({ isActive: false, completedAt: now, updatedAt: now })
    .where(and(eq(correctionsMatches.recipientId, recipientId), eq(correctionsMatches.isActive, true)))

  revalidatePath("/admin/corrections")
}

export async function markRecipientUnmatched(formData: FormData) {
  const session = await requireCorrectionsWriteSession()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const recipientId = parseRequiredText(formData.get("recipientId"), "Recipient id", 120)
  const now = new Date().toISOString()
  const db = await getDb()

  await db
    .update(correctionsRecipients)
    .set({ status: "unmatched", updatedAt: now })
    .where(eq(correctionsRecipients.id, recipientId))

  await db
    .update(correctionsMatches)
    .set({ isActive: false, updatedAt: now })
    .where(and(eq(correctionsMatches.recipientId, recipientId), eq(correctionsMatches.isActive, true)))

  revalidatePath("/admin/corrections")
}
