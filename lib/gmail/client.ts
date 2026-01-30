// Gmail API client for Cloudflare Workers

import { getAccessToken, clearTokenCache } from "./auth"
import type { GmailCredentials, EmailParams, SendEmailResult } from "./types"

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

/**
 * Get Gmail credentials from Cloudflare environment
 */
export function getGmailCredentials(env: {
  GDRIVE_SERVICE_ACCOUNT_EMAIL?: string
  GDRIVE_PRIVATE_KEY?: string
  GDRIVE_PRIVATE_KEY_ID?: string
  GMAIL_SENDER_EMAIL?: string
}): GmailCredentials {
  // Validate all required credentials are present
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error("Gmail credentials not configured: GDRIVE_SERVICE_ACCOUNT_EMAIL is missing")
  }
  if (!env.GDRIVE_PRIVATE_KEY) {
    throw new Error("Gmail credentials not configured: GDRIVE_PRIVATE_KEY is missing")
  }
  if (!env.GDRIVE_PRIVATE_KEY_ID) {
    throw new Error("Gmail credentials not configured: GDRIVE_PRIVATE_KEY_ID is missing")
  }
  if (!env.GMAIL_SENDER_EMAIL) {
    throw new Error("Gmail credentials not configured: GMAIL_SENDER_EMAIL is missing")
  }

  return {
    clientEmail: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GDRIVE_PRIVATE_KEY,
    privateKeyId: env.GDRIVE_PRIVATE_KEY_ID,
    senderEmail: env.GMAIL_SENDER_EMAIL,
  }
}

/**
 * Encode a string to base64url (URL-safe base64)
 */
function base64UrlEncode(str: string): string {
  // Encode to UTF-8 bytes, then to base64
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Create an RFC 2822 formatted email message
 */
function createEmailMessage(
  from: string,
  to: string,
  subject: string,
  body: string,
  replyTo?: string
): string {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
  ]

  if (replyTo) {
    headers.push(`Reply-To: ${replyTo}`)
  }

  // RFC 2822 format: headers, blank line, body
  return headers.join("\r\n") + "\r\n\r\n" + body
}

/**
 * Send an email using Gmail API
 */
export async function sendEmail(
  credentials: GmailCredentials,
  params: EmailParams,
  retryOn401 = true
): Promise<SendEmailResult> {
  try {
    const accessToken = await getAccessToken(credentials)

    // Create the email message in RFC 2822 format
    const emailMessage = createEmailMessage(
      credentials.senderEmail,
      params.to,
      params.subject,
      params.body,
      params.replyTo
    )

    // Encode as base64url
    const encodedMessage = base64UrlEncode(emailMessage)

    // Send via Gmail API
    const response = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    })

    // Handle 401 by clearing cache and retrying once
    if (response.status === 401 && retryOn401) {
      await clearTokenCache()
      return sendEmail(credentials, params, false)
    }

    if (!response.ok) {
      const error = await response.text()
      console.error("Gmail API error:", response.status, error)
      return {
        success: false,
        error: `Gmail API error: ${response.status} - ${error}`,
      }
    }

    const data = (await response.json()) as { id: string; threadId: string }

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    console.error("Failed to send email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    }
  }
}
