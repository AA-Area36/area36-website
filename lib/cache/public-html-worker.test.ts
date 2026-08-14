// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import {
  getPublicHtmlCacheKey,
  serveWithPublicHtmlCache,
} from "./public-html-worker"

const enabledEnv = {
  PUBLIC_HTML_CACHE_ENABLED: "1",
  PUBLIC_HTML_CACHE_HOSTS: "area36.org,www.area36.org",
}

function districtEnv(mode: "hosted" | "external_redirect" = "hosted", enabled = true) {
  const first = vi.fn().mockResolvedValue({
    enabled: enabled ? 1 : 0,
    mode,
    redirectUrl: mode === "external_redirect" ? "https://example.test" : null,
    displayName: "District",
  })
  const bind = vi.fn(() => ({ first }))
  const prepare = vi.fn(() => ({ bind }))
  return {
    ...enabledEnv,
    DB: { prepare } as unknown as D1Database,
  }
}

class MemoryCache {
  private readonly entries = new Map<string, Response>()

  async match(request: RequestInfo | URL) {
    const key = request instanceof Request ? request.url : String(request)
    return this.entries.get(key)?.clone()
  }

  async put(request: RequestInfo | URL, response: Response) {
    const key = request instanceof Request ? request.url : String(request)
    this.entries.set(key, response.clone())
  }
}

function documentRequest(
  url: string,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    headers: {
      accept: "text/html",
      "sec-fetch-dest": "document",
      ...headers,
    },
  })
}

describe("public HTML Worker cache", () => {
  it("keys otherwise identical pages by locale", () => {
    const english = getPublicHtmlCacheKey(
      documentRequest("https://area36.org/about", {
        cookie: "a36_locale=en",
      }),
      enabledEnv,
    )
    const spanish = getPublicHtmlCacheKey(
      documentRequest("https://area36.org/about", {
        cookie: "a36_locale=es",
      }),
      enabledEnv,
    )

    expect(english?.url).toContain("__a36_cache_locale=en")
    expect(spanish?.url).toContain("__a36_cache_locale=es")
    expect(english?.url).not.toBe(spanish?.url)
  })

  it.each([
    ["admin route", "https://area36.org/admin", {}],
    ["API route", "https://area36.org/api/events", {}],
    ["filtered URL", "https://area36.org/events?q=assembly", {}],
    [
      "authenticated or preview cookie",
      "https://area36.org/about",
      { cookie: "a36_locale=en; authjs.session-token=secret" },
    ],
    [
      "authorization header",
      "https://area36.org/about",
      { authorization: "Bearer redacted" },
    ],
    [
      "React Server Component request",
      "https://area36.org/about",
      { accept: "text/x-component", rsc: "1" },
    ],
    [
      "duplicate locale cookie",
      "https://area36.org/about",
      { cookie: "a36_locale=en; a36_locale=es" },
    ],
    ["unapproved host", "https://preview.example/about", {}],
  ])("bypasses the cache for an %s", (_label, url, headers) => {
    expect(
      getPublicHtmlCacheKey(documentRequest(url, headers), enabledEnv),
    ).toBeNull()
  })

  it("serves a stored localized response without rendering twice", async () => {
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    const next = vi.fn(async () =>
      new Response("<!doctype html><html lang=\"es\"></html>", {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "private, no-store",
        },
      }),
    )
    const request = documentRequest("https://area36.org/about", {
      cookie: "a36_locale=es",
    })
    const context = {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise)
      },
    }

    const first = await serveWithPublicHtmlCache({
      request,
      env: enabledEnv,
      ctx: context,
      cache,
      next,
    })
    await Promise.all(pending)
    const second = await serveWithPublicHtmlCache({
      request,
      env: enabledEnv,
      ctx: context,
      cache,
      next,
    })

    expect(first.headers.get("x-area36-cache")).toBe("MISS")
    expect(first.headers.get("cache-control")).toContain("s-maxage=300")
    expect(second.headers.get("x-area36-cache")).toBe("HIT")
    expect(await second.text()).toContain('lang="es"')
    expect(next).toHaveBeenCalledOnce()
  })

  it("does not store responses that set a cookie", async () => {
    const cache = new MemoryCache()
    const putSpy = vi.spyOn(cache, "put")
    const response = await serveWithPublicHtmlCache({
      request: documentRequest("https://area36.org/about"),
      env: enabledEnv,
      ctx: { waitUntil: vi.fn() },
      cache,
      next: async () =>
        new Response("<html></html>", {
          headers: {
            "content-type": "text/html",
            "set-cookie": "a36_locale=en; Path=/",
          },
        }),
    })

    expect(response.headers.get("x-area36-cache")).toBeNull()
    expect(putSpy).not.toHaveBeenCalled()
  })

  it("caches configured hosted district pages with host-isolated keys", async () => {
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    const context = {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise)
      },
    }
    const district12 = vi.fn(async () =>
      new Response("<html>District 12</html>", {
        headers: { "content-type": "text/html" },
      })
    )
    const district13 = vi.fn(async () =>
      new Response("<html>District 13</html>", {
        headers: { "content-type": "text/html" },
      })
    )

    const first12 = await serveWithPublicHtmlCache({
      request: documentRequest("https://d12.area36.org/calendar", { cookie: "a36_locale=en" }),
      env: districtEnv(),
      ctx: context,
      cache,
      next: district12,
    })
    const first13 = await serveWithPublicHtmlCache({
      request: documentRequest("https://d13.area36.org/calendar", { cookie: "a36_locale=en" }),
      env: districtEnv(),
      ctx: context,
      cache,
      next: district13,
    })
    await Promise.all(pending)
    const second12 = await serveWithPublicHtmlCache({
      request: documentRequest("https://d12.area36.org/calendar", { cookie: "a36_locale=en" }),
      env: districtEnv(),
      ctx: context,
      cache,
      next: district12,
    })

    expect(first12.headers.get("x-area36-cache")).toBe("MISS")
    expect(first13.headers.get("x-area36-cache")).toBe("MISS")
    expect(second12.headers.get("x-area36-cache")).toBe("HIT")
    expect(await second12.text()).toContain("District 12")
    expect(district12).toHaveBeenCalledOnce()
    expect(district13).toHaveBeenCalledOnce()
  })

  it.each([
    ["disabled district", districtEnv("hosted", false), "https://d14.area36.org/"],
    ["external redirect district", districtEnv("external_redirect"), "https://d15.area36.org/"],
    ["district admin", districtEnv(), "https://d16.area36.org/admin"],
    ["district API", districtEnv(), "https://d17.area36.org/api/events"],
  ])("bypasses the cache for a %s", async (_label, env, url) => {
    const response = await serveWithPublicHtmlCache({
      request: documentRequest(url),
      env,
      ctx: { waitUntil: vi.fn() },
      cache: new MemoryCache(),
      next: async () => new Response("uncached"),
    })

    expect(response.headers.get("x-area36-cache")).toBeNull()
  })
})
