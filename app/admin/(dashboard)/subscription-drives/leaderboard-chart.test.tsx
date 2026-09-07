import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LeaderboardChart } from "./leaderboard-chart"

describe("leaderboard text alternative", () => {
  it("exposes exact approved, pending and total values beyond the chart's top ten", () => {
    render(<LeaderboardChart leaderboard={Array.from({ length: 11 }, (_, index) => ({ district: String(index + 1), approved: 12, pending: 3, total: 15 }))} />)
    const table = screen.getByRole("table", { name: "Subscription counts by district" })
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["District", "Approved", "Pending", "Total"])
    const last = within(table).getByRole("rowheader", { name: "District 11" }).closest("tr")!
    expect(within(last).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["12", "3", "15"])
  })
})
