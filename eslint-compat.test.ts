// @vitest-environment node
import { describe, expect, it } from "vitest"
import { ESLint } from "eslint"

describe("ESLint 10 compatibility bridge", () => {
  it("continues reporting React, accessibility, import and Next violations", async () => {
    const eslint = new ESLint()
    const [result] = await eslint.lintText(
      'export default () => <div>{[1].map(() => <img src="/fixture.png" />)}</div>',
      { filePath: "components/lint-regression.tsx" },
    )

    expect(result.fatalErrorCount).toBe(0)
    expect(result.messages.map((message) => message.ruleId)).toEqual(
      expect.arrayContaining([
        "react/display-name",
        "react/jsx-key",
        "jsx-a11y/alt-text",
        "import/no-anonymous-default-export",
        "@next/next/no-img-element",
      ]),
    )
  })
})
