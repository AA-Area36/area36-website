/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AUTH_SECRET: string
      AUTH_GOOGLE_ID: string
      AUTH_GOOGLE_SECRET: string
      RECAPTCHA_SECRET_KEY: string
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: string
    }
  }

  interface Window {
    grecaptcha?: {
      reset?: () => void
      execute?: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

// Cloudflare environment bindings
interface CloudflareEnv {
  DB: D1Database
  ASSETS: Fetcher
  DRIVE_IMAGES: R2Bucket
  AUTH_SECRET: string
  AUTH_GOOGLE_ID: string
  AUTH_GOOGLE_SECRET: string
  RECAPTCHA_SECRET_KEY: string
  // Google Drive API credentials
  GDRIVE_SERVICE_ACCOUNT_EMAIL: string
  GDRIVE_PRIVATE_KEY: string
  GDRIVE_PRIVATE_KEY_ID: string
  // Google Drive folder IDs
  GDRIVE_ROOT_FOLDER_ID: string
  GDRIVE_NEWSLETTERS_FOLDER_ID: string
  GDRIVE_RESOURCES_FOLDER_ID: string
  GDRIVE_RECORDINGS_FOLDER_ID: string
  GDRIVE_COMMITTEES_FOLDER_ID: string
  // Gmail API (uses same service account as Google Drive)
  GMAIL_SENDER_EMAIL: string
}

declare module "@opennextjs/cloudflare" {
  export function getCloudflareContext(options?: { async: true }): Promise<{ env: CloudflareEnv; ctx: ExecutionContext }>
  export function getCloudflareContext(options?: { async?: false }): { env: CloudflareEnv; ctx: ExecutionContext }
}

export {}
