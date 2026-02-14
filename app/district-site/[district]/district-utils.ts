import { headers } from "next/headers"
import { getDistrictSiteConfig } from "@/lib/district/queries"

export const MEETING_FINDER_URL = "https://www.aa.org/find-aa"
export const NEW_TO_AA_URL = "https://www.newtoaa.org"

export function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

function parseDateOnly(value: string): Date | null {
  const parts = value.split("-").map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null

  const [year, month, day] = parts
  if (!year || !month || !day) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return null

  return date
}

export function formatDistrictDate(value: string): string {
  const parsed = parseDateOnly(value)
  if (!parsed) return value

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed)
}

export function formatDistrictPublished(value: string | null): string {
  if (!value) return "Unpublished"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

export async function getDistrictBasePath(districtNumber: number): Promise<string> {
  const host = (await headers()).get("host")?.toLowerCase() ?? ""
  const isDistrictSubdomain = /^d(?:[1-9]|1[1-9]|2[0-7])\.area36\.org(?::\d+)?$/.test(host)
  return isDistrictSubdomain ? "" : `/district-site/${districtNumber}`
}

export function districtHref(basePath: string, path: string): string {
  return `${basePath}${path === "/" ? "" : path}` || "/"
}

export function extractFirstUrl(value: string): string | null {
  const urlMatch = value.match(/https?:\/\/[^\s<>"')]+/i)
  if (!urlMatch) return null
  try {
    const parsed = new URL(urlMatch[0])
    return parsed.toString()
  } catch {
    return null
  }
}

export function getAgendaDocumentLink(body: string): string | null {
  return extractFirstUrl(body)
}

function isLocalPreviewHost(host: string): boolean {
  return host === "localhost" || host.startsWith("localhost:") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0")
}

export async function resolveDistrictSiteForRender(
  districtNumber: number,
): Promise<{ title: string; previewMode: boolean } | null> {
  const site = await getDistrictSiteConfig(districtNumber)
  if (site?.enabled && site.mode === "hosted") {
    return {
      title: site.displayName?.trim() || `District ${districtNumber}`,
      previewMode: false,
    }
  }

  const host = (await headers()).get("host")?.toLowerCase() ?? ""
  const forcedPreview = process.env.DISTRICT_LOCAL_PREVIEW === "1"
  const localPreview = process.env.NODE_ENV !== "production" && isLocalPreviewHost(host)
  if (!forcedPreview && !localPreview) return null

  return {
    title: `District ${districtNumber}`,
    previewMode: true,
  }
}
