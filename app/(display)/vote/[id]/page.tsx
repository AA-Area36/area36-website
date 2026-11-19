import { getCloudflareContext } from "@opennextjs/cloudflare"
import { notFound } from "next/navigation"
import { z } from "zod"
import { getPublicRoom } from "@/lib/voting/store"
import { VotingShell } from "../voting-shell"
import { VotingRoom } from "./voting-room"

export const dynamic = "force-dynamic"
export const metadata = { title: "Voting room | Area 36", robots: { index: false, follow: false }, referrer: "same-origin" as const }

export default async function VotingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const { env } = await getCloudflareContext({ async: true })
  const room = await getPublicRoom(env.DB, id)
  return <VotingShell><VotingRoom pageId={id} initialRoom={room} /></VotingShell>
}
