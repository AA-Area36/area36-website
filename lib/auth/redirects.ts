export function isAllowedRedirectHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  if (normalized === "area36.org" || normalized === "www.area36.org") {
    return true
  }

  const districtMatch = normalized.match(/^d(\d{1,2})\.area36\.org$/)
  if (!districtMatch) return false

  const districtNumber = Number(districtMatch[1])
  return (
    Number.isFinite(districtNumber) &&
    districtNumber >= 1 &&
    districtNumber <= 27 &&
    districtNumber !== 10
  )
}
