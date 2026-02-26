/**
 * True when a file can be rendered by the inline PDF viewer.
 */
export function supportsInlinePdfPreview(mimeType: string | undefined): boolean {
  if (!mimeType) return false
  return mimeType.split(";")[0]?.trim().toLowerCase() === "application/pdf"
}
