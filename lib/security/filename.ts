export function sanitizeFilenameForHeader(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[\r\n"]/g, "")
    .replace(/[^\w\s.-]/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 150)

  return cleaned.length > 0 ? cleaned : fallback
}
