"use client"

import * as React from "react"

const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+|(?<![@\w])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#][^\s<>"']*)?/gi
const SIMPLE_TRAILING_PUNCTUATION = /[.,!?;:\u2019\u201d]+$/
const CLOSING_DELIMITERS: Record<string, string> = {
  ")": "(",
  "]": "[",
  "}": "{",
}

interface DescriptionPart {
  text: string
  href?: string
}

function countCharacter(value: string, character: string): number {
  return [...value].filter((current) => current === character).length
}

function trimTrailingPunctuation(value: string): string {
  let trimmed = value.replace(SIMPLE_TRAILING_PUNCTUATION, "")

  while (trimmed.length > 0) {
    const closing = trimmed.at(-1)!
    const opening = CLOSING_DELIMITERS[closing]
    if (!opening) break

    if (countCharacter(trimmed, closing) <= countCharacter(trimmed, opening)) break
    trimmed = trimmed.slice(0, -1)
  }

  return trimmed
}

function toHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function getDescriptionParts(description: string): DescriptionPart[] {
  const parts: DescriptionPart[] = []
  const matches = description.matchAll(new RegExp(LINK_PATTERN.source, LINK_PATTERN.flags))
  let cursor = 0

  for (const match of matches) {
    const matchStart = match.index
    const matchedText = match[0]
    const linkText = trimTrailingPunctuation(matchedText)

    if (!linkText) continue
    if (matchStart > cursor) {
      parts.push({ text: description.slice(cursor, matchStart) })
    }

    parts.push({ text: linkText, href: toHref(linkText) })
    cursor = matchStart + linkText.length
  }

  if (cursor < description.length) {
    parts.push({ text: description.slice(cursor) })
  }

  return parts
}

export function EventDescription({ description }: { description: string }) {
  return (
    <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
      {getDescriptionParts(description).map((part, index) =>
        part.href ? (
          <a
            key={`${part.href}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            data-no-card-link
            className="text-primary underline-offset-4 hover:underline focus-visible:underline"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation()
              }
            }}
          >
            {part.text}
          </a>
        ) : (
          <React.Fragment key={`${part.text}-${index}`}>{part.text}</React.Fragment>
        ),
      )}
    </p>
  )
}
