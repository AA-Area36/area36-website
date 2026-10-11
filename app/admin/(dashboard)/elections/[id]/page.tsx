import { getCloudflareContext } from "@opennextjs/cloudflare"
import { notFound, redirect } from "next/navigation"
import { z } from "zod"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { hasPermission } from "@/lib/auth/rbac"
import { getElection } from "@/lib/elections/store"
import { ElectionWorkspace } from "../election-workspace"

export const dynamic = "force-dynamic"
export const metadata = { title: "Election tally" }
export default async function ElectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAreaAdminSession()
  if (!session || !await hasPermission(session, "elections:read")) redirect("/admin")
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { env } = await getCloudflareContext({ async: true })
  const [election, canWrite] = await Promise.all([getElection(env.DB, id), hasPermission(session, "elections:write")])
  if (!election) notFound()
  return <ElectionWorkspace initialElection={election} canWrite={canWrite} />
}
