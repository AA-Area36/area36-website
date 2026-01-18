/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AUTH_SECRET: string
      AUTH_GOOGLE_ID: string
      AUTH_GOOGLE_SECRET: string
      HCAPTCHA_SECRET_KEY: string
      NEXT_PUBLIC_HCAPTCHA_SITE_KEY: string
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
  HCAPTCHA_SECRET_KEY: string
}

declare module "@opennextjs/cloudflare" {
  export function getCloudflareContext(options?: { async: true }): Promise<{ env: CloudflareEnv; ctx: ExecutionContext }>
  export function getCloudflareContext(options?: { async?: false }): { env: CloudflareEnv; ctx: ExecutionContext }
}

export {}
