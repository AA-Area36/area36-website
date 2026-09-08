import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { readFileSync, readdirSync } from "node:fs"

/** Real SQLite SQL/transactions behind the D1 methods used by our queries.
 * Enforce D1's parameter ceiling, which local SQLite does not impose itself.
 */
export function createSqliteD1() {
  const sqlite = new DatabaseSync(":memory:")
  const parameterCounts: number[] = []
  function prepare(sql: string, args: SQLInputValue[] = []) {
    const execute = (arrays = false) => {
      parameterCounts.push(args.length)
      if (args.length > 100) throw new Error("D1 maximum bound parameters exceeded")
      const statement = sqlite.prepare(sql)
      statement.setReturnArrays(arrays)
      return statement.all(...args)
    }
    return {
      bind: (...values: SQLInputValue[]) => prepare(sql, values),
      execute,
      all: async () => ({ success: true, results: execute(), meta: {} }),
      raw: async () => execute(true),
      first: async () => execute()[0] ?? null,
      run: async () => ({ success: true, results: execute(), meta: {} }),
    }
  }
  const client = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sqlite.exec("BEGIN")
      try {
        const results = statements.map((statement) => ({ success: true, results: statement.execute(), meta: {} }))
        sqlite.exec("COMMIT")
        return results
      } catch (error) {
        sqlite.exec("ROLLBACK")
        throw error
      }
    },
  }
  const migrate = () => {
    const directory = new URL("../../lib/db/migrations/", import.meta.url)
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
      sqlite.exec(readFileSync(new URL(file, directory), "utf8"))
    }
  }
  // Test adapter implements the subset of D1 used by Drizzle and these actions.
  return { sqlite, client: client as unknown as D1Database, parameterCounts, migrate }
}
