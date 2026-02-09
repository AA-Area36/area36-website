export type SiteContext =
  | { kind: "area" }
  | { kind: "district"; districtNumber: number; subdomain: string }
  | { kind: "unknown" }

function normalizeHost(host: string | null | undefined): string {
  return (host ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "") // tolerate trailing dot
}

export function resolveSiteFromHost(host: string | null | undefined): SiteContext {
  const h = normalizeHost(host)
  if (!h) return { kind: "unknown" }

  if (h === "area36.org" || h === "www.area36.org") {
    return { kind: "area" }
  }

  const m = h.match(/^d(\d{1,2})\.area36\.org$/)
  if (!m) return { kind: "unknown" }

  const districtNumber = Number(m[1])
  if (!Number.isFinite(districtNumber) || districtNumber < 1 || districtNumber > 27 || districtNumber === 10) {
    return { kind: "unknown" }
  }

  return { kind: "district", districtNumber, subdomain: `d${districtNumber}` }
}

