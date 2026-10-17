import { getCloudflareContext } from "@opennextjs/cloudflare"
import { notFound } from "next/navigation"
import { getPublicElection } from "@/lib/elections/public"
import { PublicElectionDisplay } from "./public-election-display"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Election display | Area 36",
  robots: { index: false, follow: false },
  referrer: "same-origin" as const,
}

export default async function ElectionDisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { env } = await getCloudflareContext({ async: true })
  const election = await getPublicElection(env.DB, id)
  if (!election) notFound()
  return <PublicElectionDisplay initialElection={election} />
}
