import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/accept-language"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales"

// Generate a short request ID for tracing
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  const path = request.nextUrl.pathname
  
  // Force HTTPS redirect
  const proto = request.headers.get("x-forwarded-proto")
  const host = request.headers.get("host")

  if (proto === "http" && host && !host.includes("localhost")) {
    const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
    return NextResponse.redirect(httpsUrl, 301)
  }

  // Add request ID header for tracing through the request lifecycle
  const response = NextResponse.next()
  response.headers.set("x-request-id", requestId)

  // Locale selection:
  // - Respect explicit cookie (user choice)
  // - Otherwise derive from Accept-Language and persist (browser settings / locale headers)
  const existing = request.cookies.get(LOCALE_COOKIE)?.value
  if (!isLocale(existing)) {
    const detected = detectLocaleFromAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LOCALE
    response.cookies.set(LOCALE_COOKIE, detected, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
    response.headers.set("vary", "accept-language")
    response.headers.set("x-locale", detected)
  } else {
    response.headers.set("x-locale", existing)
  }
  
  // Log API and dynamic routes (skip static assets for noise reduction)
  if (path.startsWith("/api/") || path.includes("[")) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Request started",
      requestId,
      method: request.method,
      path,
      userAgent: request.headers.get("user-agent")?.slice(0, 100),
    }))
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes that handle their own redirects
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
