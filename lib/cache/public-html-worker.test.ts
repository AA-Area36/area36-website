// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import {
  getPublicHtmlCacheKey,
  serveWithPublicHtmlCache,
} from "./public-html-worker"

const enabledEnv = {
  PUBLIC_HTML_CACHE_ENABLED: "1",
  PUBLIC_HTML_CACHE_HOSTS: "area36.org,www.area36.org",
  DB: { prepare: () => ({ first: async () => ({ revision: 0 }) }) } as unknown as D1Database,
}

function districtEnv(mode: "hosted" | "external_redirect" = "hosted", enabled = true) {
  const first = vi.fn().mockResolvedValue({
    enabled: enabled ? 1 : 0,
    mode,
    redirectUrl: mode === "external_redirect" ? "https://example.test" : null,
    displayName: "District",
  })
  const bind = vi.fn(() => ({ first }))
  const prepare = vi.fn((sql: string) => sql.includes("public_html_revision")
    ? { first: async () => ({ revision: 0 }) }
    : { bind })
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
    expect(first.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate")
    expect(first.headers.get("cloudflare-cdn-cache-control")).toBe("no-store")
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


describe("public HTML publishing revisions", () => {
  it("re-renders every locale and host after an atomic content revision change", async () => {
    let revision = 1
    const env = {
      ...enabledEnv,
      DB: { prepare: () => ({ first: async () => ({ revision }) }) } as unknown as D1Database,
    }
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    const next = vi.fn(async () => new Response(`<html>revision ${revision}</html>`, {
      headers: { "content-type": "text/html" },
    }))
    const read = async (host: string, locale: string) => {
      const response = await serveWithPublicHtmlCache({
        request: documentRequest(`https://${host}/about`, { cookie: `a36_locale=${locale}` }),
        env, cache, next, ctx: { waitUntil: (promise) => { pending.push(promise) } },
      })
      await Promise.all(pending)
      return response
    }
    for (const host of ["area36.org", "www.area36.org"]) {
      for (const locale of ["en", "es"]) {
        expect((await read(host, locale)).headers.get("x-area36-cache")).toBe("MISS")
        expect((await read(host, locale)).headers.get("x-area36-cache")).toBe("HIT")
      }
    }
    revision++
    for (const host of ["area36.org", "www.area36.org"]) {
      for (const locale of ["en", "es"]) {
        const response = await read(host, locale)
        expect(response.headers.get("x-area36-cache")).toBe("MISS")
        expect(await response.text()).toContain("revision 2")
      }
    }
    expect(next).toHaveBeenCalledTimes(8)
  })

  it.each(["missing row", "missing migration", "missing binding"])("bypasses stored HTML with a %s", async (condition) => {
    const cache = new MemoryCache()
    const match = vi.spyOn(cache, "match")
    const put = vi.spyOn(cache, "put")
    const first = async () => {
      if (condition === "missing migration") throw new Error("no such table")
      return null
    }
    const response = await serveWithPublicHtmlCache({
      request: documentRequest("https://area36.org/about"),
      env: { ...enabledEnv, DB: condition === "missing binding" ? undefined : { prepare: () => ({ first }) } as unknown as D1Database },
      cache, ctx: { waitUntil: vi.fn() },
      next: async () => new Response("current content", { headers: { "content-type": "text/html" } }),
    })
    expect(await response.text()).toBe("current content")
    expect(match).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })
})
