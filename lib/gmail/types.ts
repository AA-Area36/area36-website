// Gmail API types for Cloudflare Workers

export interface GmailCredentials {
  clientEmail: string
  privateKey: string
  privateKeyId: string
  /** The email address to send from (impersonate via domain-wide delegation) */
  senderEmail: string
}

export interface EmailParams {
  to: string
  subject: string
  body: string
  /** Optional reply-to address (e.g., the contact form submitter's email) */
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}
