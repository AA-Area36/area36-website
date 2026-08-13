import { detectLocaleFromAcceptLanguage } from "@/lib/i18n/accept-language"
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n/locales"

const EDGE_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=3600"

type PublicHtmlCacheEnv = {
  PUBLIC_HTML_CACHE_ENABLED?: string
  PUBLIC_HTML_CACHE_HOSTS?: string
}

type CacheContext = {
  waitUntil(promise: Promise<unknown>): void
}

type CacheStore = Pick<Cache, "match" | "put">

function parseCookies(value: string | null): {
  values: Map<string, string>
  hasDuplicate: boolean
} {
  const parsed = new Map<string, string>()
  let hasDuplicate = false
  for (const part of value?.split(";") ?? []) {
    const separator = part.indexOf("=")
    if (separator <= 0) continue
    const name = part.slice(0, separator).trim()
    const cookieValue = part.slice(separator + 1).trim()
    if (name) {
      if (parsed.has(name)) hasDuplicate = true
      parsed.set(name, cookieValue)
    }
  }
  return { values: parsed, hasDuplicate }
}

function allowedHosts(env: PublicHtmlCacheEnv): Set<string> {
  return new Set(
    (env.PUBLIC_HTML_CACHE_HOSTS ?? "area36.org,www.area36.org")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function getPublicHtmlCacheKey(
  request: Request,
  env: PublicHtmlCacheEnv,
): Request | null {
  if (env.PUBLIC_HTML_CACHE_ENABLED !== "1") return null
  if (request.method !== "GET") return null
  if (request.headers.has("authorization")) return null

  const url = new URL(request.url)
  if (!allowedHosts(env).has(url.hostname.toLowerCase())) return null
  if (url.search) return null
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname === "/favicon.ico"
  ) {
    return null
  }

  const accept = request.headers.get("accept")
  if (!accept?.includes("text/html")) return null
  if (
    request.headers.has("rsc") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) return null

  const parsedCookies = parseCookies(request.headers.get("cookie"))
  if (parsedCookies.hasDuplicate) return null
  const cookies = parsedCookies.values
  if ([...cookies.keys()].some((name) => name !== LOCALE_COOKIE)) return null

  const cookieLocale = cookies.get(LOCALE_COOKIE)
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : detectLocaleFromAcceptLanguage(request.headers.get("accept-language")) ??
      DEFAULT_LOCALE

  const cacheUrl = new URL(url)
  cacheUrl.searchParams.set("__a36_cache_locale", locale)

  return new Request(cacheUrl, {
    method: "GET",
    headers: {
      accept: "text/html",
    },
  })
}

function canStorePublicHtml(response: Response): boolean {
  if (response.status !== 200) return false
  if (!response.headers.get("content-type")?.includes("text/html")) return false
  if (response.headers.has("set-cookie")) return false
  if (response.headers.get("vary")?.trim() === "*") return false
  return true
}

function withCacheStatus(response: Response, status: "HIT" | "MISS"): Response {
  const headers = new Headers(response.headers)
  headers.set("x-area36-cache", status)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function serveWithPublicHtmlCache({
  request,
  env,
  ctx,
  cache,
  next,
}: {
  request: Request
  env: PublicHtmlCacheEnv
  ctx: CacheContext
  cache: CacheStore
  next: () => Promise<Response>
}): Promise<Response> {
  const cacheKey = getPublicHtmlCacheKey(request, env)
  if (!cacheKey) return next()

  const cached = await cache.match(cacheKey)
  if (cached) return withCacheStatus(cached, "HIT")

  const response = await next()
  if (!canStorePublicHtml(response)) return response

  const headers = new Headers(response.headers)
  headers.delete("set-cookie")
  headers.delete("x-request-id")
  headers.set("cache-control", EDGE_CACHE_CONTROL)
  headers.set("cloudflare-cdn-cache-control", EDGE_CACHE_CONTROL)
  headers.set("x-area36-cache", "MISS")

  const cacheableResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
  ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()))
  return cacheableResponse
}
