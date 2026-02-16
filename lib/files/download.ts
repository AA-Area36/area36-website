/**
 * Download a file by fetching it and triggering a browser download.
 * This works for password-protected files where the unlock cookie is httpOnly
 * and must be sent via fetch (same-origin) rather than window.open (new tab).
 *
 * For non-protected files with direct GDrive URLs, falls back to window.open.
 */
export async function downloadFile(url: string, filename?: string): Promise<void> {
  // Direct GDrive URLs can be opened normally
  if (!url.startsWith("/api/files/download/")) {
    window.open(url, "_blank")
    return
  }

  const maxRetries = 2
  let lastError: string | undefined

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
      return
    }

    // Check if it's a password-required retry scenario
    try {
      const json = await res.json() as { requiresPassword?: boolean; error?: string }
      if (json.requiresPassword && attempt < maxRetries) {
        continue // retry
      }
      lastError = json.error || `Download failed: ${res.status}`
    } catch {
      lastError = `Download failed: ${res.status}`
    }
    break
  }

  // If all retries failed, fall back to opening in a new tab
  // (user will see the error but at least something happens)
  console.error("Protected file download failed:", lastError)
  window.open(url, "_blank")
}
