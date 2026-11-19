import Link from "next/link"
import { redirect } from "next/navigation"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { hasPermission } from "@/lib/auth/rbac"
import { listMotionRooms } from "@/lib/voting/store"
import { CreateMotion } from "./motion-controls"

export const dynamic = "force-dynamic"
export const metadata = { title: "Assembly motions" }

export default async function MotionsPage() {
  const session = await requireAreaAdminSession()
  if (!session || !await hasPermission(session, "elections:read")) redirect("/admin")
  const { env } = await getCloudflareContext({ async: true })
  const [motions, canWrite] = await Promise.all([listMotionRooms(env.DB), hasPermission(session, "elections:write")])
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link className="text-sm text-primary underline underline-offset-4" href="/admin/elections">Third Legacy elections</Link>
    <header><h1 className="font-serif text-4xl tracking-tight">Assembly motions</h1><p className="mt-2 text-muted-foreground">Share a question with the assembly and collect anonymous Yes, No, or Abstain votes.</p></header>
    {canWrite && <CreateMotion />}
    <section className="space-y-3"><h2 className="font-serif text-2xl">Motion history</h2>
      {motions.length ? <ul className="divide-y rounded-xl border bg-card">{motions.map(motion => <li key={motion.id}><Link className="flex flex-wrap items-center justify-between gap-3 rounded-md p-4 hover:bg-muted/40" href={`/admin/elections/motions/${motion.id}`}><span className="break-words font-medium">{motion.title}</span><span className="text-sm text-muted-foreground">{motion.status === "open" ? "Voting open" : motion.resultsPublished ? "Results posted" : "Voting closed"}</span></Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No motions yet.</p>}
    </section>
  </div>
}
