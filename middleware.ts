import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/accept-language"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales"
import { resolveSiteFromHost } from "@/lib/site/resolve-site"
import { getDistrictSiteForMiddleware } from "@/lib/district/sites-middleware"

// Generate a short request ID for tracing
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function joinPaths(basePath: string, incomingPath: string): string {
  const a = (basePath || "/").replace(/\/+$/, "")
  const b = (incomingPath || "/").replace(/^\/+/, "")
  if (!a) return `/${b}`
  if (!b) return a || "/"
  return `${a}/${b}`
}

function buildExternalRedirectTarget(redirectUrl: string, pathname: string, search: string): string {
  const base = new URL(redirectUrl)
  base.pathname = joinPaths(base.pathname, pathname)

  // Merge query strings: base first, then incoming.
  const merged = new URLSearchParams(base.search)
  const incoming = new URLSearchParams(search)
  for (const [k, v] of incoming.entries()) merged.set(k, v)
  const qs = merged.toString()
  base.search = qs ? `?${qs}` : ""
  return base.toString()
}

export function middleware(request: NextRequest) {
  const requestId = generateRequestId()
  const path = request.nextUrl.pathname

  function applyRequestHeadersAndLocale(response: NextResponse) {
    response.headers.set("x-request-id", requestId)

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
  }
  
  // Force HTTPS redirect
  const proto = request.headers.get("x-forwarded-proto")
  const host = request.headers.get("host")

  if (proto === "http" && host && !host.includes("localhost")) {
    const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
    return NextResponse.redirect(httpsUrl, 301)
  }

  const site = resolveSiteFromHost(host)

  // Handle district subdomains: hosted or external redirect.
  // Note: middleware runs in the edge/runtime environment; on Cloudflare/OpenNext we can access env via getCloudflareContext.
  if (site.kind === "district") {
    const pathname = request.nextUrl.pathname
    const search = request.nextUrl.search

    // If we can access the Cloudflare env, consult D1 for district site config.
    // If we can't (local dev / preview), fall back to treating it as "not configured".
    const maybeConfigPromise = (async () => {
      try {
        const mod = await import("@opennextjs/cloudflare")
        const { env } = await mod.getCloudflareContext({ async: true })
        return await getDistrictSiteForMiddleware(env, site.districtNumber)
      } catch {
        return null
      }
    })()

    // IMPORTANT: Middleware must be sync. Next.js allows returning a Promise from middleware.
    // We'll return a Promise chain here to keep the rest of the logic intact.
    return maybeConfigPromise.then((config) => {
      if (!config || !config.enabled) {
        const r = NextResponse.redirect(`https://area36.org/districts`, 302)
        r.headers.set("x-request-id", requestId)
        return r
      }

      if (config.mode === "external_redirect") {
        if (!config.redirectUrl) {
          const r = NextResponse.redirect(`https://area36.org/districts`, 302)
          r.headers.set("x-request-id", requestId)
          return r
        }
        const target = buildExternalRedirectTarget(config.redirectUrl, pathname, search)
        const r = NextResponse.redirect(target, 308)
        r.headers.set("x-request-id", requestId)
        return r
      }

      // Hosted district site.
      // Rewrite:
      // - /admin/* -> /admin/districts/{n}/*
      // - public pages -> /district-site/{n}/*
      if (pathname.startsWith("/admin/login")) {
        const callbackUrl = `https://d${site.districtNumber}.area36.org/admin`
        const r = NextResponse.redirect(
          `https://area36.org/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          302
        )
        r.headers.set("x-request-id", requestId)
        return r
      }
      if (pathname.startsWith("/api/auth")) {
        const target = `https://area36.org${pathname}${search}`
        const r = NextResponse.redirect(target, 302)
        r.headers.set("x-request-id", requestId)
        return r
      }
      if (pathname.startsWith("/admin")) {
        const rest = pathname.slice("/admin".length) || ""
        const url = request.nextUrl.clone()
        url.pathname = `/admin/districts/${site.districtNumber}${rest}`
        const r = NextResponse.rewrite(url)
        applyRequestHeadersAndLocale(r)
        return r
      }

      const isBypassed =
        pathname.startsWith("/api/") ||
        pathname.startsWith("/_next/") ||
        pathname === "/favicon.ico"

      if (isBypassed) {
        const r = NextResponse.next()
        applyRequestHeadersAndLocale(r)
        return r
      }

      const url = request.nextUrl.clone()
      url.pathname = `/district-site/${site.districtNumber}${pathname === "/" ? "" : pathname}`
      const r = NextResponse.rewrite(url)
      applyRequestHeadersAndLocale(r)
      return r
    })
  }

  const response = NextResponse.next()
  applyRequestHeadersAndLocale(response)
  
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
