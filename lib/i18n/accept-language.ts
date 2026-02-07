import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from "@/lib/i18n/locales"

type WeightedLang = { tag: string; q: number }

function parseAcceptLanguage(value: string): WeightedLang[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [tagRaw, ...params] = part.split(";").map((s) => s.trim())
      const tag = (tagRaw || "").toLowerCase()
      let q = 1
      for (const p of params) {
        const m = /^q=([0-9.]+)$/.exec(p)
        if (m) {
          const n = Number(m[1])
          if (!Number.isNaN(n)) q = n
        }
      }
      return { tag, q }
    })
    .sort((a, b) => b.q - a.q)
}

export function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE

  for (const { tag } of parseAcceptLanguage(header)) {
    // Match "es-ES" -> "es", etc.
    const primary = tag.split("-")[0]
    if ((SUPPORTED_LOCALES as readonly string[]).includes(primary)) return primary as Locale
  }

  return DEFAULT_LOCALE
}

