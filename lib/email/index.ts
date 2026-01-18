import type { Event } from "@/lib/db/schema"

interface DenialEmailToSubmitterParams {
  to: string
  eventTitle: string
  reason: string
}

interface DenialEmailToChairParams {
  eventTitle: string
  eventDetails: Event
  reason: string
  reviewedBy: string
}

// Stubbed for now - logs to console instead of sending
export async function sendDenialEmailToSubmitter(params: DenialEmailToSubmitterParams): Promise<void> {
  console.log("📧 [STUB] Would send denial email to submitter:", {
    to: params.to,
    subject: `Event Submission Update: ${params.eventTitle}`,
    body: `Your event "${params.eventTitle}" was not approved.\n\nReason: ${params.reason}`,
  })
}

export async function sendDenialEmailToChair(params: DenialEmailToChairParams): Promise<void> {
  const locationParts: string[] = []
  if (params.eventDetails.locationType !== "in-person") {
    locationParts.push(params.eventDetails.locationType === "online" ? "Online" : "Hybrid")
  }
  if (params.eventDetails.address) {
    locationParts.push(params.eventDetails.address)
  }
  const location = locationParts.length > 0 ? locationParts.join(" • ") : "TBD"

  console.log("📧 [STUB] Would send denial email to chair:", {
    to: "chairperson@area36.org",
    subject: `Event Denied: ${params.eventTitle}`,
    eventDetails: {
      title: params.eventDetails.title,
      date: params.eventDetails.date,
      location,
      meetingLink: params.eventDetails.meetingLink,
      submitterEmail: params.eventDetails.submitterEmail,
    },
    reason: params.reason,
    reviewedBy: params.reviewedBy,
  })
}
