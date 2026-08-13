import { NextResponse } from "next/server"

export function createApiRequestId(): string {
  return crypto.randomUUID()
}

export function createApiErrorResponse({
  message,
  requestId,
  status = 500,
  details,
}: {
  message: string
  requestId: string
  status?: number
  details?: Record<string, unknown>
}): NextResponse {
  return NextResponse.json(
    {
      ...details,
      error: message,
      requestId,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  )
}

export function getRedactedErrorMetadata(error: unknown): {
  errorName: string
} {
  return {
    errorName: error instanceof Error ? error.name : "UnknownError",
  }
}
