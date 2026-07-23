import type { ContentDoc } from "@/lib/content/schema"

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function getAtPath(doc: ContentDoc, path: string): unknown {
  const parts = path.split(".").filter(Boolean)
  let cur: unknown = doc
  for (const part of parts) {
    if (Array.isArray(cur)) {
      const idx = Number(part)
      if (!Number.isInteger(idx)) return undefined
      cur = cur[idx]
      continue
    }
    if (!isRecord(cur)) return undefined
    cur = cur[part]
  }
  return cur
}

export function setAtPath(doc: ContentDoc, path: string, value: unknown): ContentDoc {
  const parts = path.split(".").filter(Boolean)
  if (parts.length === 0) return doc

  // Clone the root so callers can treat updates immutably.
  const root = structuredClone(doc) as ContentDoc

  let cur: unknown = root
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    const isLast = i === parts.length - 1

    const nextPart = parts[i + 1]
    const nextIsIndex = nextPart !== undefined && /^\d+$/.test(nextPart)

    if (Array.isArray(cur)) {
      const idx = Number(part)
      if (!Number.isInteger(idx) || idx < 0) return root
      if (isLast) {
        cur[idx] = value
        return root
      }
      if (cur[idx] == null) cur[idx] = nextIsIndex ? [] : {}
      cur = cur[idx]
      continue
    }

    if (!isRecord(cur)) return root
    if (isLast) {
      cur[part] = value
      return root
    }
    if (cur[part] == null) cur[part] = nextIsIndex ? [] : {}
    cur = cur[part]
  }

  return root
}

export type Translator = {
  t: (path: string, fallback?: string) => string
  obj: (path: string) => Record<string, unknown> | undefined
}

export function createTranslator(doc: ContentDoc): Translator {
  return {
    t(path, fallback) {
      const v = getAtPath(doc, path)
      if (typeof v === "string") return v
      if (typeof v === "number") return String(v)
      if (typeof v === "boolean") return v ? "true" : "false"
      return fallback ?? ""
    },
    obj(path) {
      const v = getAtPath(doc, path)
      if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>
      return undefined
    },
  }
}

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key) => {
    const v = vars[key]
    return v == null ? "" : String(v)
  })
}
