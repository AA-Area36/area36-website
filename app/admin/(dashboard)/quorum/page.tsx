import { listQuorumEvents } from "@/lib/quorum/google"
import { getQuorumDriveOwnerEmail, hasQuorumDriveOwnerAuthorization } from "@/lib/google/user-drive-auth"
import { QuorumAdminClient } from "./quorum-admin-client"

export const dynamic = "force-dynamic"

async function loadEvents() {
  try {
    return { events: await listQuorumEvents(), configurationError: false }
  } catch (error) {
    console.error("Failed to load quorum events", error)
    return { events: [], configurationError: true }
  }
}

export default async function QuorumAdminPage() {
  const [result, driveAuthorized, ownerEmail] = await Promise.all([
    loadEvents(),
    hasQuorumDriveOwnerAuthorization().catch(() => false),
    getQuorumDriveOwnerEmail().catch(() => "webmaster@area36.org"),
  ])
  return (
    <QuorumAdminClient
      events={result.events}
      configurationError={result.configurationError}
      driveAuthorized={driveAuthorized}
      ownerEmail={ownerEmail}
    />
  )
}
