import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/header", () => ({ Header: () => <header>Header</header> }))
vi.mock("@/components/footer", () => ({ Footer: () => <footer>Footer</footer> }))
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import NotFound from "./not-found"

describe("NotFound", () => {
  it("provides a programmatically focusable skip-link target", () => {
    render(<NotFound />)

    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "main-content")
    expect(main).toHaveAttribute("tabindex", "-1")
  })
})
