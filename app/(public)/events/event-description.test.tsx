import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EventDescription } from "./event-description"

describe("EventDescription", () => {
  it("makes web links clickable and leaves surrounding punctuation as text", () => {
    const { container } = render(
      <EventDescription description="Register at https://example.com/signup?source=calendar, or www.area36.org/events." />,
    )

    const explicitLink = screen.getByRole("link", {
      name: "https://example.com/signup?source=calendar",
    })
    const wwwLink = screen.getByRole("link", { name: "www.area36.org/events" })

    expect(explicitLink).toHaveAttribute("href", "https://example.com/signup?source=calendar")
    expect(wwwLink).toHaveAttribute("href", "https://www.area36.org/events")
    expect(explicitLink).toHaveAttribute("target", "_blank")
    expect(explicitLink).toHaveAttribute("rel", "noopener noreferrer")
    expect(container.querySelector("p")).toHaveTextContent(
      "Register at https://example.com/signup?source=calendar, or www.area36.org/events.",
    )
  })

  it("recognizes bare domains without linking the domain inside an email address", () => {
    render(
      <EventDescription description="Details: area36.org/events. Contact events@example.com." />,
    )

    expect(screen.getByRole("link", { name: "area36.org/events" })).toHaveAttribute(
      "href",
      "https://area36.org/events",
    )
    expect(screen.queryByRole("link", { name: /example\.com/ })).not.toBeInTheDocument()
  })

  it("keeps balanced URL parentheses while trimming sentence punctuation", () => {
    render(
      <EventDescription description="Read https://en.wikipedia.org/wiki/Alcoholics_Anonymous_(book)." />,
    )

    expect(
      screen.getByRole("link", {
        name: "https://en.wikipedia.org/wiki/Alcoholics_Anonymous_(book)",
      }),
    ).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Alcoholics_Anonymous_(book)",
    )
  })

  it("does not trigger the containing event card when a description link is clicked", () => {
    const onCardClick = vi.fn()

    render(
      <div onClick={onCardClick}>
        <EventDescription description="Visit https://area36.org/events for details." />
      </div>,
    )

    fireEvent.click(screen.getByRole("link"))

    expect(onCardClick).not.toHaveBeenCalled()
  })
})
