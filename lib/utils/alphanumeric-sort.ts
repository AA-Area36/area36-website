const ROMAN_NUMERAL_REGEX =
  /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i

const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
}

const textCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
})

type SortToken =
  | { kind: "number"; value: number }
  | { kind: "text"; value: string }

function romanToNumber(token: string): number | null {
  const normalized = token.trim().toUpperCase()
  if (!normalized || !ROMAN_NUMERAL_REGEX.test(normalized)) {
    return null
  }

  let total = 0
  for (let i = 0; i < normalized.length; i += 1) {
    const current = ROMAN_VALUES[normalized[i]] ?? 0
    const next = ROMAN_VALUES[normalized[i + 1]] ?? 0
    total += current < next ? -current : current
  }

  return total
}

function tokenizeForSort(input: string): SortToken[] {
  const rawTokens = input.match(/[A-Za-z]+|\d+/g) ?? [input]

  return rawTokens.map((token) => {
    if (/^\d+$/.test(token)) {
      return { kind: "number", value: Number(token) }
    }

    const romanValue = romanToNumber(token)
    if (romanValue !== null) {
      return { kind: "number", value: romanValue }
    }

    return { kind: "text", value: token.toLowerCase() }
  })
}

/**
 * Compares strings using natural alphanumeric order with Roman numeral support.
 * Example: "Item IX" < "Item X" and "Item 9" < "Item 10".
 */
export function compareAlphaNumericWithRoman(a: string, b: string): number {
  const aTokens = tokenizeForSort(a)
  const bTokens = tokenizeForSort(b)
  const maxLength = Math.max(aTokens.length, bTokens.length)

  for (let i = 0; i < maxLength; i += 1) {
    const aToken = aTokens[i]
    const bToken = bTokens[i]

    if (!aToken) return -1
    if (!bToken) return 1

    if (aToken.kind === "number" && bToken.kind === "number") {
      if (aToken.value !== bToken.value) {
        return aToken.value - bToken.value
      }
      continue
    }

    if (aToken.kind === "number" && bToken.kind === "text") return -1
    if (aToken.kind === "text" && bToken.kind === "number") return 1

    if (aToken.kind === "text" && bToken.kind === "text") {
      const textComparison = textCollator.compare(aToken.value, bToken.value)
      if (textComparison !== 0) {
        return textComparison
      }
    }
  }

  return textCollator.compare(a, b)
}
