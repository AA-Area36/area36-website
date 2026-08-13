import type { Metadata } from "next"

export function createDistrictMetadata(title: string): Metadata {
  const districtTitle = title.trim()

  return {
    title: {
      default: `${districtTitle} | Area 36`,
      template: `%s | ${districtTitle} | Area 36`,
    },
    description: `Events, contacts, service opportunities, and updates for ${districtTitle} of Southern Minnesota Area 36.`,
  }
}
