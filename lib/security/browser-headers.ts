export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google.com https://www.recaptcha.net https://*.googleapis.com",
  "frame-src 'self' https://www.google.com https://www.recaptcha.net https://drive.google.com https://docs.google.com",
  "media-src 'self' blob: https://drive.google.com https://*.googleusercontent.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ")

export const BROWSER_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: CONTENT_SECURITY_POLICY_REPORT_ONLY,
  },
  {
    key: "Permissions-Policy",
    value: "browsing-topics=(), camera=(), geolocation=(), microphone=()",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
] as const
