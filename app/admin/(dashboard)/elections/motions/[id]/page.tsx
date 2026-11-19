import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { hasPermission } from "@/lib/auth/rbac"
import { getRoomAdmin } from "@/lib/voting/store"
import { MotionControls } from "../motion-controls"

export const dynamic = "force-dynamic"
export const metadata = { title: "Motion voting room" }

export default async function MotionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAreaAdminSession()
  if (!session || !await hasPermission(session, "elections:read")) redirect("/admin")
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { env } = await getCloudflareContext({ async: true })
  const [room, canWrite] = await Promise.all([getRoomAdmin(env.DB, id), hasPermission(session, "elections:write")])
  if (room?.kind !== "motion") notFound()
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link className="text-sm text-primary underline underline-offset-4" href="/admin/elections/motions">All motions</Link>
    <header><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Assembly motion</p><h1 className="break-words font-serif text-4xl tracking-tight">{room.title}</h1></header>
    <MotionControls initialRoom={room} canWrite={canWrite} />
  </div>
}
