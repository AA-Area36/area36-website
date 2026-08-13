import { render, screen } from "@testing-library/react"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/district-site/24",
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}))

vi.mock("@/components/accessibility-menu", () => ({
  AccessibilityMenu: () => null,
}))

vi.mock("@/components/logo", () => ({
  Logo: () => null,
}))

import { DistrictShell } from "./district-shell"

describe("DistrictShell", () => {
  it("provides a programmatically focusable skip-link target", () => {
    render(
      <DistrictShell districtNumber={24} title="District 24">
        <h1>Overview</h1>
      </DistrictShell>,
    )

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content")
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1")
  })
})
