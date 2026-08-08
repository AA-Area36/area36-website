import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"
import { getQuorumEventByKey } from "@/lib/quorum/google"
import { toPublicQuorumEvent } from "@/lib/quorum/types"
import { QuorumCheckInClient } from "./quorum-check-in-client"

type PageProps = { params: Promise<{ eventKey: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventKey } = await params
  const event = await getQuorumEventByKey(eventKey).catch(() => null)
  return {
    title: event ? `${event.title} Check-In | Area 36` : "Event Check-In | Area 36",
    description: "Check in for an Area 36 service event.",
  }
}

export default async function QuorumCheckInPage({ params }: PageProps) {
  const { eventKey } = await params
  const event = await getQuorumEventByKey(eventKey).catch(() => null)
  if (!event) notFound()

  return (
    <ReCaptchaProvider>
      <QuorumCheckInClient event={toPublicQuorumEvent(event)} />
    </ReCaptchaProvider>
  )
}
