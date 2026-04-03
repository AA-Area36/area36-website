import { ADMIN_PERMISSIONS, type AppPermission } from "@/lib/auth/permissions"

export const LOCAL_VIEW_AS_COOKIE = "a36_local_view_as"
export const LOCAL_VIEW_AS_DEFAULT = "area-admin"

const LOCAL_VIEW_AS_KEYS = ["area-admin", "chair", "officer", "no-access"] as const

export type LocalViewAsKey = (typeof LOCAL_VIEW_AS_KEYS)[number]

type LocalViewAsPreset = {
  label: string
  description: string
  isAreaAdmin: boolean
  permissions: AppPermission[]
}

export const LOCAL_VIEW_AS_PRESETS: Record<LocalViewAsKey, LocalViewAsPreset> = {
  "area-admin": {
    label: "Area Admin",
    description: "Full access",
    isAreaAdmin: true,
    permissions: [...ADMIN_PERMISSIONS],
  },
  chair: {
    label: "Corrections Chair",
    description: "View, export, edit, match, and delete in Corrections",
    isAreaAdmin: false,
    permissions: ["corrections:view", "corrections:export", "corrections:edit", "corrections:match", "corrections:delete"],
  },
  officer: {
    label: "Officer",
    description: "Read-only Corrections access",
    isAreaAdmin: false,
    permissions: ["corrections:view"],
  },
  "no-access": {
    label: "No Access",
    description: "No admin permissions",
    isAreaAdmin: false,
    permissions: [],
  },
}

export const LOCAL_VIEW_AS_OPTIONS = LOCAL_VIEW_AS_KEYS.map((key) => ({
  key,
  label: LOCAL_VIEW_AS_PRESETS[key].label,
  description: LOCAL_VIEW_AS_PRESETS[key].description,
}))

export function normalizeLocalViewAsKey(value: string | null | undefined): LocalViewAsKey {
  if (!value) return LOCAL_VIEW_AS_DEFAULT
  return (LOCAL_VIEW_AS_KEYS as readonly string[]).includes(value) ? (value as LocalViewAsKey) : LOCAL_VIEW_AS_DEFAULT
}
