// @vitest-environment node
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSqliteD1 } from "@/tests/helpers/sqlite-d1"
import { createElection, mutateElection } from "@/lib/elections/store"
import { GET } from "./route"

const context = vi.hoisted(() => ({ env: {} as CloudflareEnv }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => context }))
const id = "991d17cd-2c69-4825-bd38-e44c61783f04"
const request = (electionId = id) => GET(new Request(`https://area36.org/api/elections/${electionId}/display`), { params: Promise.resolve({ id: electionId }) })

describe("anonymous election display API", () => {
  let database: ReturnType<typeof createSqliteD1>
  beforeEach(async () => {
    database = createSqliteD1()
    database.sqlite.exec(readFileSync(new URL("../../../../../lib/db/migrations/0032_third_legacy_elections.sql", import.meta.url), "utf8"))
    context.env = { DB: database.client } as CloudflareEnv
    await createElection(database.client, { id, title: "Private until published", date: "2026-10-17" }, "admin@area36.org")
  })
  afterEach(() => database.sqlite.close())
  it("returns the same private response for invalid, missing, and unpublished elections", async () => {
    for (const electionId of ["invalid", "11111111-1111-4111-8111-111111111111", id]) {
      const response = await request(electionId)
      expect(response.status).toBe(404)
      expect(response.headers.get("Cache-Control")).toBe("no-store")
      expect(await response.json()).toMatchObject({ error: "Election display is not available." })
    }
  })
  it("allows anonymous reads only when published and revokes them immediately without changing vote data", async () => {
    await mutateElection(database.client, { id, revision: 0, commandId: "publish", command: { type: "display", officeIndex: 0, enabled: true } }, "admin@area36.org")
    const response = await request()
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toContain("no-store")
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store")
    const body = await response.json()
    expect(body).toMatchObject({ title: "Private until published", officeIndex: 0, revision: 1 })
    expect(JSON.stringify(body)).not.toContain("admin@area36.org")
    expect(body).not.toHaveProperty("spreadsheetId")
    expect(database.sqlite.prepare("SELECT count(*) AS count FROM election_revisions").get()?.count).toBe(2)
    await mutateElection(database.client, { id, revision: 1, commandId: "stop", command: { type: "display", officeIndex: 0, enabled: false } }, "admin@area36.org")
    expect((await request()).status).toBe(404)
  })
})
