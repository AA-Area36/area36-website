import { getCloudflareContext } from "@opennextjs/cloudflare"
import { redirect } from "next/navigation"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { hasPermission } from "@/lib/auth/rbac"
import { hasQuorumDriveOwnerAuthorization } from "@/lib/google/user-drive-auth"
import { listElections } from "@/lib/elections/store"
import { ElectionList } from "./election-list"

export const dynamic = "force-dynamic"
export const metadata = { title: "Third Legacy elections" }
export default async function ElectionsPage() {
  const session = await requireAreaAdminSession()
  if (!session || !await hasPermission(session, "elections:read")) redirect("/admin")
  const { env } = await getCloudflareContext({ async: true })
  const [elections, driveAuthorized, canWrite] = await Promise.all([listElections(env.DB), hasQuorumDriveOwnerAuthorization().catch(() => false), hasPermission(session, "elections:write")])
  return <ElectionList elections={elections} driveAuthorized={driveAuthorized} canWrite={canWrite} />
}
