import type { SheetData, SheetOptions } from "write-excel-file/browser"

export type SpreadsheetCellValue = string | number
export type SpreadsheetRow = Record<string, SpreadsheetCellValue>

const FORMULA_PREFIX = /^[=+\-@]/
const INVALID_SHEET_NAME_CHARACTER = /[\\/*?:[\]]/g
const MAX_SHEET_NAME_LENGTH = 31
const MIN_COLUMN_WIDTH = 12
const MAX_COLUMN_WIDTH = 50

export function escapeSpreadsheetFormula(value: SpreadsheetCellValue): SpreadsheetCellValue {
  if (typeof value !== "string" || !FORMULA_PREFIX.test(value)) {
    return value
  }

  return `'${value}`
}

export function sanitizeSpreadsheetSheetName(sheetName: string): string {
  const sanitized = sheetName
    .replace(INVALID_SHEET_NAME_CHARACTER, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SHEET_NAME_LENGTH)

  return sanitized || "Export"
}

export function buildSpreadsheet(
  rows: SpreadsheetRow[],
  sheetName: string,
): {
  sheetData: SheetData
  sheetOptions: SheetOptions<Blob>
} {
  if (rows.length === 0) {
    throw new Error("At least one spreadsheet row is required.")
  }

  const headers = Object.keys(rows[0])
  if (headers.length === 0) {
    throw new Error("At least one spreadsheet column is required.")
  }

  const sheetData: SheetData = [
    headers.map((header) => ({
      value: header,
      fontWeight: "bold",
      backgroundColor: "#E8EEF7",
      wrap: true,
    })),
    ...rows.map((row) =>
      headers.map((header) => escapeSpreadsheetFormula(row[header] ?? "")),
    ),
  ]

  const columns = headers.map((header) => {
    const longestValue = rows.reduce(
      (current, row) => Math.max(current, String(row[header] ?? "").length),
      header.length,
    )

    return {
      width: Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longestValue + 2)),
    }
  })

  return {
    sheetData,
    sheetOptions: {
      sheet: sanitizeSpreadsheetSheetName(sheetName),
      columns,
      stickyRowsCount: 1,
    },
  }
}

export async function downloadSpreadsheet({
  sheetName,
  fileName,
  rows,
}: {
  sheetName: string
  fileName: string
  rows: SpreadsheetRow[]
}): Promise<void> {
  const { default: writeExcelFile } = await import("write-excel-file/browser")
  const { sheetData, sheetOptions } = buildSpreadsheet(rows, sheetName)

  await writeExcelFile(sheetData, sheetOptions).toFile(fileName)
}
