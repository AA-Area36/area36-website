export interface DownloadResult {
  ok: boolean
  requiresPassword?: boolean
  error?: string
}

function hasFileExtension(name: string): boolean {
  return /\.[a-z0-9]{1,10}$/i.test(name.trim())
}

function extFromContentType(contentType: string | null): string | null {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase()
  switch (mime) {
    case "application/pdf":
      return "pdf"
    case "application/zip":
      return "zip"
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "text/plain":
      return "txt"
    case "text/csv":
      return "csv"
    default:
      return null
  }
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null

  // RFC 5987: filename*=UTF-8''...
  const filenameStar = /filename\*\s*=\s*([^;]+)/i.exec(header)?.[1]
  if (filenameStar) {
    const value = filenameStar.trim().replace(/^UTF-8''/i, "")
    try {
      return decodeURIComponent(value.replace(/^"|"$/g, ""))
    } catch {
      return value.replace(/^"|"$/g, "")
    }
  }

  const filename = /filename\s*=\s*([^;]+)/i.exec(header)?.[1]
  if (!filename) return null
  return filename.trim().replace(/^"|"$/g, "")
}

function resolveDownloadFilename(
  requestedName: string | undefined,
  response: Response
): string {
  const serverName = parseFilenameFromContentDisposition(
    response.headers.get("content-disposition")
  )
  const serverExt = serverName && hasFileExtension(serverName)
    ? serverName.split(".").pop()?.toLowerCase() ?? null
    : null
  const typeExt = extFromContentType(response.headers.get("content-type"))
  const fallbackExt = serverExt || typeExt

  if (requestedName) {
    if (hasFileExtension(requestedName)) return requestedName
    if (fallbackExt) return `${requestedName}.${fallbackExt}`
    return requestedName
  }

  if (serverName) return serverName
  if (fallbackExt) return `download.${fallbackExt}`
  return "download"
}

/**
 * Download a file by fetching it from the server proxy and triggering a
 * browser download.  All files are served through `/api/files/download/…`.
 *
 * For password-protected files the proxy may return 403 with
 * `{ requiresPassword: true }`.  In that case a short retry loop gives the
 * httpOnly unlock cookie time to propagate after a server action.
 *
 * Returns a result object so the caller can decide whether to show a
 * password dialog.
 */
export async function downloadFile(url: string, filename?: string): Promise<DownloadResult> {
  const maxRetries = 2

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait for cookie to propagate from server action
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const res = await fetch(url)

    if (res.ok) {
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const finalFilename = resolveDownloadFilename(filename, res)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = finalFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      return { ok: true }
    }

    // Check if it's a password-required retry scenario
    try {
      const json = await res.json() as { requiresPassword?: boolean; error?: string }
      if (json.requiresPassword && attempt < maxRetries) {
        continue // retry
      }
      if (json.requiresPassword) {
        return { ok: false, requiresPassword: true }
      }
      return { ok: false, error: json.error || `Download failed: ${res.status}` }
    } catch {
      return { ok: false, error: `Download failed: ${res.status}` }
    }
  }

  return { ok: false, error: "Download failed after retries" }
}
