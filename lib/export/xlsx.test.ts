import { strFromU8, unzipSync } from "fflate"
import { describe, expect, it, vi } from "vitest"
import {
  buildSpreadsheet,
  downloadSpreadsheet,
  escapeSpreadsheetFormula,
  sanitizeSpreadsheetSheetName,
} from "./xlsx"

const { toFile, writeExcelFile } = vi.hoisted(() => {
  const toFile = vi.fn().mockResolvedValue(undefined)
  const writeExcelFile = vi.fn(() => ({ toFile }))
  return { toFile, writeExcelFile }
})

vi.mock("write-excel-file/browser", () => ({
  default: writeExcelFile,
}))

describe("spreadsheet export", () => {
  it("keeps numeric values and escapes formula-like strings", () => {
    expect(escapeSpreadsheetFormula(42)).toBe(42)
    expect(escapeSpreadsheetFormula("normal text")).toBe("normal text")
    expect(escapeSpreadsheetFormula("=HYPERLINK(\"https://example.com\")")).toBe(
      "'=HYPERLINK(\"https://example.com\")",
    )
    expect(escapeSpreadsheetFormula("+cmd")).toBe("'+cmd")
    expect(escapeSpreadsheetFormula("-2+3")).toBe("'-2+3")
    expect(escapeSpreadsheetFormula("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)")
    expect(escapeSpreadsheetFormula("'=already escaped")).toBe("'=already escaped")
  })

  it("builds deterministic columns, fills missing values, and caps widths", () => {
    const { sheetData, sheetOptions } = buildSpreadsheet(
      [
        { Name: "José Álvarez", Count: 7, Notes: "x".repeat(100) },
        { Name: "=unsafe", Count: 0 },
      ],
      "Corrections/Contacts:*?[]",
    )

    expect(sheetData[0]).toEqual([
      expect.objectContaining({ value: "Name", fontWeight: "bold" }),
      expect.objectContaining({ value: "Count", fontWeight: "bold" }),
      expect.objectContaining({ value: "Notes", fontWeight: "bold" }),
    ])
    expect(sheetData[1]).toEqual(["José Álvarez", 7, "x".repeat(100)])
    expect(sheetData[2]).toEqual(["'=unsafe", 0, ""])
    expect(sheetOptions).toEqual({
      sheet: "Corrections Contacts",
      stickyRowsCount: 1,
      columns: [{ width: 14 }, { width: 12 }, { width: 50 }],
    })
  })

  it("sanitizes invalid or blank worksheet names", () => {
    expect(sanitizeSpreadsheetSheetName("  [Area] / District: 36?  ")).toBe(
      "Area District 36",
    )
    expect(sanitizeSpreadsheetSheetName("***")).toBe("Export")
    expect(sanitizeSpreadsheetSheetName("x".repeat(40))).toHaveLength(31)
  })

  it("rejects exports without rows or columns", () => {
    expect(() => buildSpreadsheet([], "Contacts")).toThrow(
      "At least one spreadsheet row is required.",
    )
    expect(() => buildSpreadsheet([{}], "Contacts")).toThrow(
      "At least one spreadsheet column is required.",
    )
  })

  it("downloads the generated workbook with the requested file name", async () => {
    await downloadSpreadsheet({
      sheetName: "Contacts",
      fileName: "contacts.xlsx",
      rows: [{ Name: "Example", Count: 1 }],
    })

    expect(writeExcelFile).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ sheet: "Contacts", stickyRowsCount: 1 }),
    )
    expect(toFile).toHaveBeenCalledWith("contacts.xlsx")
  })

  it("produces a valid XLSX archive with Unicode and inert formula text", async () => {
    const { default: writeExcelFile } = await vi.importActual<
      typeof import("write-excel-file/universal")
    >("write-excel-file/universal")
    const { sheetData, sheetOptions } = buildSpreadsheet(
      [{ Name: "José Álvarez", Notes: "=1+1", Count: 2 }],
      "Contacts",
    )

    const blob = await writeExcelFile(sheetData, sheetOptions).toBlob()
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const workbookXml = strFromU8(files["xl/workbook.xml"])
    const sharedStringsXml = strFromU8(files["xl/sharedStrings.xml"])
    const worksheetXml = strFromU8(files["xl/worksheets/sheet1.xml"])

    expect(strFromU8(files["[Content_Types].xml"])).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    )
    expect(workbookXml).toContain('name="Contacts"')
    expect(sharedStringsXml).toContain("José Álvarez")
    expect(sharedStringsXml).toContain("'=1+1")
    expect(worksheetXml).not.toContain("<f>")
  })
})
