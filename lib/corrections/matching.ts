import type { CorrectionsContact, CorrectionsRecipient } from "@/lib/db/schema"

export type RankedContactCandidate = {
  contact: CorrectionsContact
  score: number
  reasons: string[]
}

function norm(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

function normZip(value: string | null | undefined): string {
  return norm(value).replace(/[^0-9]/g, "").slice(0, 5)
}

function hasLocation(recipient: CorrectionsRecipient): boolean {
  return !!(
    norm(recipient.releaseAddress) ||
    norm(recipient.releaseCity) ||
    norm(recipient.releaseCounty) ||
    norm(recipient.releaseState) ||
    normZip(recipient.releaseZip)
  )
}

export function rankContactsForRecipient(
  recipient: CorrectionsRecipient,
  contacts: CorrectionsContact[]
): RankedContactCandidate[] {
  const recipientZip = normZip(recipient.releaseZip)
  const recipientCity = norm(recipient.releaseCity)
  const recipientCounty = norm(recipient.releaseCounty)
  const recipientState = norm(recipient.releaseState)

  const ranked = contacts
    .filter((contact) => contact.active)
    .map((contact) => {
      const reasons: string[] = []
      let score = 0

      const contactZip = normZip(contact.zipCode)
      const contactCity = norm(contact.city)
      const contactCounty = norm(contact.county)
      const contactState = norm(contact.state)

      if (recipientZip && contactZip) {
        if (recipientZip === contactZip) {
          score += 100
          reasons.push("Exact zip match")
        } else if (recipientZip.slice(0, 3) === contactZip.slice(0, 3)) {
          score += 75
          reasons.push("Nearby zip prefix")
        }
      }

      if (recipientCity && contactCity && recipientCity === contactCity) {
        score += 60
        reasons.push("City match")
        if (recipientState && contactState && recipientState === contactState) {
          score += 15
          reasons.push("City + state match")
        }
      }

      if (recipientCounty && contactCounty && recipientCounty === contactCounty) {
        score += 45
        reasons.push("County match")
        if (recipientState && contactState && recipientState === contactState) {
          score += 10
          reasons.push("County + state match")
        }
      }

      if (recipientState && contactState && recipientState === contactState) {
        score += 25
        reasons.push("State match")
      }

      if (!hasLocation(recipient)) {
        score = 1
        reasons.push("Recipient has limited location data")
      }

      if (score === 0) {
        reasons.push("No direct location overlap")
      }

      return { contact, score, reasons }
    })

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const cityA = norm(a.contact.city)
    const cityB = norm(b.contact.city)
    if (cityA !== cityB) return cityA.localeCompare(cityB)
    return `${a.contact.firstName} ${a.contact.lastName}`.localeCompare(
      `${b.contact.firstName} ${b.contact.lastName}`
    )
  })

  return ranked
}
