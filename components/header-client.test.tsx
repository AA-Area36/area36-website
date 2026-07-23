import { act, fireEvent, render, screen } from "@testing-library/react"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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
  ThemeToggle: () => <button type="button">Theme</button>,
}))

vi.mock("@/components/language-selector", () => ({
  LanguageSelector: () => <button type="button">Language</button>,
}))

vi.mock("@/components/accessibility-menu", () => ({
  AccessibilityMenu: () => <button type="button">Accessibility</button>,
}))

vi.mock("@/components/logo", () => ({
  Logo: () => null,
}))

import { HeaderClient } from "./header-client"

describe("HeaderClient mobile focus management", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not steal focus during initial hydration", () => {
    render(
      <HeaderClient
        brandTitle="Area 36"
        brandSubtitle="Northern Minnesota"
        navigation={[{ name: "Home", href: "/" }]}
      />,
    )

    expect(screen.getByRole("button", { name: "Open menu" })).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })

  it("focuses the menu on open and restores focus after close", () => {
    render(
      <HeaderClient
        brandTitle="Area 36"
        brandSubtitle="Northern Minnesota"
        navigation={[{ name: "Home", href: "/" }]}
      />,
    )

    const menuButton = screen.getByRole("button", { name: "Open menu" })
    fireEvent.click(menuButton)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(screen.getAllByRole("link", { name: "Home" }).at(-1)).toHaveFocus()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus()
  })
})
