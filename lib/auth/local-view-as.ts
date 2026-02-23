import { cookies } from "next/headers"
import { isLocalAdminBypassEnabled } from "@/lib/auth/dev-bypass"
import {
  LOCAL_VIEW_AS_DEFAULT,
  LOCAL_VIEW_AS_COOKIE,
  LOCAL_VIEW_AS_PRESETS,
  normalizeLocalViewAsKey,
  type LocalViewAsKey,
} from "@/lib/auth/local-view-as-shared"
import type { AppPermission } from "@/lib/auth/permissions"

type SessionLike = {
  user?: {
    id?: string
    email?: string | null
  }
} | null

export type LocalViewAsProfile = {
  key: LocalViewAsKey
  label: string
  description: string
  isAreaAdmin: boolean
  permissions: AppPermission[]
}

function isLocalBypassEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === "local-admin@area36.org"
}

export function isLocalBypassSession(session: SessionLike): boolean {
  if (!session?.user) return false
  if (session.user.id === "local-admin") return true
  return isLocalBypassEmail(session.user.email)
}

async function readLocalViewAsKey(): Promise<LocalViewAsKey> {
  if (!(await isLocalAdminBypassEnabled())) return LOCAL_VIEW_AS_DEFAULT

  try {
    const cookieStore = await cookies()
    return normalizeLocalViewAsKey(cookieStore.get(LOCAL_VIEW_AS_COOKIE)?.value)
  } catch {
    return LOCAL_VIEW_AS_DEFAULT
  }
}

export async function getLocalViewAsProfile(): Promise<LocalViewAsProfile> {
  const key = await readLocalViewAsKey()
  const preset = LOCAL_VIEW_AS_PRESETS[key]

  return {
    key,
    label: preset.label,
    description: preset.description,
    isAreaAdmin: preset.isAreaAdmin,
    permissions: [...preset.permissions],
  }
}

export async function getLocalViewAsProfileForSession(session: SessionLike): Promise<LocalViewAsProfile | null> {
  if (!isLocalBypassSession(session)) return null
  return getLocalViewAsProfile()
}
