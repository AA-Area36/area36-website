import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Force HTTPS redirect
  const proto = request.headers.get("x-forwarded-proto")
  const host = request.headers.get("host")

  if (proto === "http" && host && !host.includes("localhost")) {
    const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
    return NextResponse.redirect(httpsUrl, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes that handle their own redirects
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
