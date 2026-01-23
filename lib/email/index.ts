import { getCloudflareContext } from "@opennextjs/cloudflare"
import { sendEmail, getGmailCredentials } from "@/lib/gmail/client"
import type { Event } from "@/lib/db/schema"

// Recipient email mapping for contact form
const RECIPIENT_EMAILS: Record<string, string> = {
  general: "chairperson@area36.org",
  chairperson: "chairperson@area36.org",
  delegate: "delegate@area36.org",
  treasurer: "treasurer@area36.org",
  secretary: "secretary@area36.org",
  webmaster: "webmaster@area36.org",
  accessibility: "accessibility@area36.org",
  archives: "archives@area36.org",
  cpc: "cpc@area36.org",
  corrections: "corrections@area36.org",
  grapevine: "grapevine@area36.org",
  literature: "literature@area36.org",
  pi: "pi@area36.org",
  treatment: "treatment@area36.org",
}

// Recipient display names for email subject/body
const RECIPIENT_NAMES: Record<string, string> = {
  general: "General Inquiry",
  chairperson: "Area Chairperson",
  delegate: "Delegate",
  treasurer: "Treasurer",
  secretary: "Secretary",
  webmaster: "Website / Technical",
  accessibility: "Accessibility Committee",
  archives: "Archives Committee",
  cpc: "CPC Committee",
  corrections: "Corrections Committee",
  grapevine: "Grapevine Committee",
  literature: "Literature Committee",
  pi: "Public Information Committee",
  treatment: "Treatment Committee",
}

export interface ContactEmailParams {
  recipient: string // key from RECIPIENT_EMAILS
  firstName: string
  lastName: string
  email: string
  phone?: string
  subject: string
  message: string
}

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

/**
 * Send a contact form submission email
 */
export async function sendContactEmail(params: ContactEmailParams): Promise<{ success: boolean; error?: string }> {
  const recipientEmail = RECIPIENT_EMAILS[params.recipient]
  const recipientName = RECIPIENT_NAMES[params.recipient] || params.recipient

  if (!recipientEmail) {
    console.error("Invalid recipient:", params.recipient)
    return { success: false, error: "Invalid recipient" }
  }

  try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const phoneInfo = params.phone ? `\nPhone: ${params.phone}` : ""

    const body = `New contact form submission from the Area 36 website.

From: ${params.firstName} ${params.lastName}
Email: ${params.email}${phoneInfo}
To: ${recipientName}

Subject: ${params.subject}

Message:
${params.message}

---
This message was sent via the Area 36 website contact form.
To reply, use the Reply-To address or email ${params.email} directly.`

    const result = await sendEmail(credentials, {
      to: recipientEmail,
      subject: `[Area 36 Contact] ${params.subject}`,
      body,
      replyTo: params.email,
    })

    if (!result.success) {
      console.error("Failed to send contact email:", result.error)
    }

    return result
  } catch (error) {
    console.error("Error sending contact email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send denial notification to event submitter
 */
export async function sendDenialEmailToSubmitter(params: DenialEmailToSubmitterParams): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const body = `Thank you for submitting your event "${params.eventTitle}" to the Area 36 website.

After review, the event was not approved for the following reason:

${params.reason}

If you believe this was in error or would like to resubmit with changes, please contact us at chairperson@area36.org.

Thank you for your understanding.

---
Area 36 Southern Minnesota
https://area36.org`

    const result = await sendEmail(credentials, {
      to: params.to,
      subject: `Event Submission Update: ${params.eventTitle}`,
      body,
    })

    if (!result.success) {
      console.error("Failed to send denial email to submitter:", result.error)
    }
  } catch (error) {
    console.error("Error sending denial email to submitter:", error)
  }
}

/**
 * Send denial notification to chair (audit trail)
 */
export async function sendDenialEmailToChair(params: DenialEmailToChairParams): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const credentials = getGmailCredentials(env)

    const locationParts: string[] = []
    if (params.eventDetails.locationType !== "in-person") {
      locationParts.push(params.eventDetails.locationType === "online" ? "Online" : "Hybrid")
    }
    if (params.eventDetails.address) {
      locationParts.push(params.eventDetails.address)
    }
    const location = locationParts.length > 0 ? locationParts.join(" - ") : "TBD"

    const meetingLinkInfo = params.eventDetails.meetingLink
      ? `\nMeeting Link: ${params.eventDetails.meetingLink}`
      : ""

    const body = `An event submission has been denied.

Event Details:
- Title: ${params.eventDetails.title}
- Date: ${params.eventDetails.date}
- Location: ${location}${meetingLinkInfo}
- Submitter Email: ${params.eventDetails.submitterEmail || "Not provided"}

Denial Reason:
${params.reason}

Reviewed By: ${params.reviewedBy}

---
This is an automated notification for record-keeping purposes.`

    const result = await sendEmail(credentials, {
      to: "chairperson@area36.org",
      subject: `Event Denied: ${params.eventTitle}`,
      body,
    })

    if (!result.success) {
      console.error("Failed to send denial email to chair:", result.error)
    }
  } catch (error) {
    console.error("Error sending denial email to chair:", error)
  }
}
