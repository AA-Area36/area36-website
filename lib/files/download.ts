export interface DownloadResult {
  ok: boolean
  requiresPassword?: boolean
  error?: string
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function summarizeUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    const hasUnlock = u.searchParams.has("unlock")
    return `${u.pathname}${hasUnlock ? "?unlock=***" : ""}`
  } catch {
    return url.split("?")[0] || url
  }
}

function isApiDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/files/download/")
  } catch {
    return url.startsWith("/api/files/download/")
  }
}

function triggerNativeDownload(url: string, filename?: string): void {
  const a = document.createElement("a")
  a.href = url
  // Keep download attr only when caller provided an extension; let server
  // Content-Disposition control the final filename otherwise.
  if (filename && hasFileExtension(filename)) {
    a.download = filename
  }
  a.rel = "noopener"
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
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
 * `{ requiresPassword: true }` (or `x-requires-password: 1` on HEAD preflight).
 * Those responses are surfaced immediately (no retry).
 *
 * Transient failures (network errors and retryable 4xx/5xx) are retried.
 *
 * Returns a result object so the caller can decide whether to show a
 * password dialog.
 */
export async function downloadFile(url: string, filename?: string): Promise<DownloadResult> {
  const maxRetries = 2
  const requestId = createRequestId()
  const useNativeDownload = isApiDownloadUrl(url)

  console.info("[download] start", {
    requestId,
    url: summarizeUrl(url),
    filename,
    mode: useNativeDownload ? "native-navigation" : "blob-fetch",
  })

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait for cookie to propagate from server action
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.info("[download] attempt", {
      requestId,
      attempt: attempt + 1,
      maxAttempts: maxRetries + 1,
    })

    if (useNativeDownload) {
      try {
        const head = await fetch(url, {
          method: "HEAD",
          cache: "no-store",
        })

        if (head.ok) {
          triggerNativeDownload(url, filename)
          console.info("[download] native download started", {
            requestId,
            status: head.status,
          })
          return { ok: true }
        }

        const requiresPassword = head.headers.get("x-requires-password") === "1"
        if (requiresPassword) {
          console.warn("[download] native preflight requires password", {
            requestId,
            status: head.status,
          })
          return { ok: false, requiresPassword: true }
        }

        if (head.status === 403) {
          console.warn("[download] native preflight forbidden", {
            requestId,
            status: head.status,
          })
          return { ok: false, error: "Access denied (403)" }
        }

        if (shouldRetryStatus(head.status) && attempt < maxRetries) {
          console.warn("[download] native preflight retryable status", {
            requestId,
            attempt: attempt + 1,
            status: head.status,
          })
          continue
        }

        console.warn("[download] native preflight failed; falling back to fetch", {
          requestId,
          status: head.status,
        })
      } catch (error) {
        console.warn("[download] native preflight errored; falling back to fetch", {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    let res: Response
    try {
      res = await fetch(url)
    } catch (error) {
      console.error("[download] network failure", {
        requestId,
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
      })
      if (attempt < maxRetries) continue
      return { ok: false, error: "Network error during download" }
    }

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
      // Delay revoke for Safari/WebKit reliability.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
      console.info("[download] success", {
        requestId,
        status: res.status,
        bytes: blob.size,
        contentType: res.headers.get("content-type"),
        finalFilename,
      })
      return { ok: true }
    }

    // Check if it's a password-required retry scenario
    try {
      const json = await res.json() as { requiresPassword?: boolean; error?: string }
      if (json.requiresPassword) {
        console.warn("[download] requires password", {
          requestId,
          status: res.status,
        })
        return { ok: false, requiresPassword: true }
      }

      if (res.status === 403) {
        console.warn("[download] forbidden", {
          requestId,
          status: res.status,
          error: json.error || null,
        })
        return { ok: false, error: json.error || "Access denied (403)" }
      }

      if (shouldRetryStatus(res.status) && attempt < maxRetries) {
        console.warn("[download] retryable failure", {
          requestId,
          attempt: attempt + 1,
          status: res.status,
          error: json.error || null,
        })
        continue
      }

      console.error("[download] failed", {
        requestId,
        status: res.status,
        error: json.error || null,
      })
      return { ok: false, error: json.error || `Download failed: ${res.status}` }
    } catch {
      console.error("[download] failed non-json response", {
        requestId,
        status: res.status,
      })
      return { ok: false, error: `Download failed: ${res.status}` }
    }
  }

  console.error("[download] failed after retries", { requestId })
  return { ok: false, error: "Download failed after retries" }
}
