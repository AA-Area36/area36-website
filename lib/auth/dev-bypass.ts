import { headers } from "next/headers"
import { districtNumbers } from "@/lib/constants/districts"
import type { A36Session } from "@/lib/auth"

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase()
  return h === "localhost" || h.startsWith("localhost:") || h.startsWith("127.0.0.1") || h.startsWith("0.0.0.0")
}

export async function isLocalAdminBypassEnabled(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false
  if (process.env.LOCAL_ADMIN_BYPASS === "0") return false
  if (process.env.LOCAL_ADMIN_BYPASS === "1") return true

  try {
    const host = (await headers()).get("host") ?? ""
    return isLocalHost(host)
  } catch {
    return false
  }
}

export function createLocalAdminBypassSession(): A36Session {
  return {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: "local-admin",
      name: "Local Admin",
      email: "local-admin@area36.org",
      image: null,
      isAreaAdmin: true,
      districtAdminFor: [...districtNumbers],
    },
  }
}
