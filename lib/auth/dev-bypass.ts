import { districtNumbers } from "@/lib/constants/districts"
import type { A36Session } from "@/lib/auth"

export async function isLocalAdminBypassEnabled(): Promise<boolean> {
  return process.env.NODE_ENV !== "production" && process.env.LOCAL_ADMIN_BYPASS === "1"
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
