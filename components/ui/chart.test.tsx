import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

describe("Recharts runtime compatibility", () => {
  it("renders the leaderboard chart primitives", () => {
    const { container } = render(
      <BarChart
        width={480}
        height={240}
        data={[
          { district: "District 1", approved: 8, pending: 2 },
          { district: "District 2", approved: 5, pending: 1 },
        ]}
        layout="vertical"
      >
        <YAxis dataKey="district" type="category" />
        <XAxis type="number" />
        <Bar dataKey="approved" stackId="subscriptions" />
        <Bar dataKey="pending" stackId="subscriptions" />
      </BarChart>
    )

    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument()
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(4)
  })
})
