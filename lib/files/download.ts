export interface DownloadResult {
  ok: boolean
  requiresPassword?: boolean
  error?: string
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
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename || "download"
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
