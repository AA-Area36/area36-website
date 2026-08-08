import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getQuorumEventByKey } from "@/lib/quorum/google"
import { buildQuorumSummary } from "@/lib/quorum/summary"
import { toPublicQuorumEvent } from "@/lib/quorum/types"
import { QuorumDashboardClient } from "./quorum-dashboard-client"

export const metadata: Metadata = {
  title: "Quorum Dashboard | Area 36",
  description: "Live aggregate quorum totals for an Area 36 service event.",
}

type PageProps = { params: Promise<{ eventKey: string }> }

export default async function QuorumDashboardPage({ params }: PageProps) {
  const { eventKey } = await params
  const event = await getQuorumEventByKey(eventKey).catch(() => null)
  if (!event) notFound()
  const summary = await buildQuorumSummary(event).catch(() => ({
    voting: 0,
    nonVoting: 0,
    total: 0,
    target: event.quorumTarget,
    quorumMet: false,
    status: event.status,
    updatedAt: new Date().toISOString(),
  }))
  return <QuorumDashboardClient event={toPublicQuorumEvent(event)} initialSummary={summary} />
}
