"use client"

import * as React from "react"
import { MultiSelect } from "@/components/multi-select"
import { eventTypes } from "@/lib/db/schema"

const EVENT_TYPE_OPTIONS = eventTypes.map((type) => ({
  label: type,
  value: type,
}))

function parseDefaultTypes(value: string): string[] {
  const allowed = new Set(eventTypes)
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item) => allowed.has(item as (typeof eventTypes)[number]))

  return parsed.length > 0 ? parsed : ["District"]
}

export function EventTypesField({
  name,
  defaultValue,
}: {
  name: string
  defaultValue: string
}) {
  const [selected, setSelected] = React.useState<string[]>(() => parseDefaultTypes(defaultValue))

  return (
    <>
      <MultiSelect
        options={EVENT_TYPE_OPTIONS}
        value={selected}
        onChange={setSelected}
        placeholder="Select event type(s)"
        className="w-full justify-between"
      />
      <input type="hidden" name={name} value={selected.join(", ")} />
    </>
  )
}
