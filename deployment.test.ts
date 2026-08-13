import { describe, expect, it } from "vitest"
import packageJson from "./package.json"

describe("deployment safety gates", () => {
  it("applies remote D1 migrations after a successful build and before deploying the Worker", () => {
    expect(packageJson.scripts["db:migrate:remote"]).toBe("wrangler d1 migrations apply DB --remote")
    expect(packageJson.scripts.deploy).toMatch(
      /^opennextjs-cloudflare build && pnpm db:migrate:remote && wrangler deploy$/
    )
  })
})
