import { describe, expect, it } from "vitest"
import { createDistrictMetadata } from "./metadata"

describe("createDistrictMetadata", () => {
  it("provides a district-specific default and child-page title template", () => {
    expect(createDistrictMetadata("District 24")).toEqual({
      title: {
        default: "District 24 | Area 36",
        template: "%s | District 24 | Area 36",
      },
      description:
        "Events, contacts, service opportunities, and updates for District 24 of Southern Minnesota Area 36.",
    })
  })

  it("uses the configured district name without surrounding whitespace", () => {
    expect(createDistrictMetadata("  Arrowhead District  ")).toMatchObject({
      title: {
        default: "Arrowhead District | Area 36",
        template: "%s | Arrowhead District | Area 36",
      },
    })
  })
})
