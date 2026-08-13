import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "./multi-select"

describe("MultiSelect accessibility props", () => {
  it("connects its label and validation message to the combobox", () => {
    render(
      <>
        <Label htmlFor="types">Types</Label>
        <MultiSelect
          id="types"
          options={[{ value: "one", label: "One" }]}
          value={[]}
          onChange={vi.fn()}
          aria-invalid="true"
          aria-describedby="types-error"
          aria-required="true"
        />
        <p id="types-error">Select a type</p>
      </>
    )

    const combobox = screen.getByRole("combobox", { name: "Types" })
    expect(combobox).toHaveAttribute("aria-invalid", "true")
    expect(combobox).toHaveAttribute("aria-describedby", "types-error")
    expect(combobox).toHaveAttribute("aria-required", "true")
  })
})
