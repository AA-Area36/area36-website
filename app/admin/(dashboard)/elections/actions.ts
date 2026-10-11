"use server"

import { after } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { signIn } from "@/lib/auth"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { hasPermission } from "@/lib/auth/rbac"
import { GOOGLE_DRIVE_FILE_SCOPE, getQuorumDriveOwnerEmail } from "@/lib/google/user-drive-auth"
import { createElectionSchema, mutationSchema } from "@/lib/elections/model"
import { createElection, getElection, mutateElection, ElectionConflict } from "@/lib/elections/store"
import { syncElection } from "@/lib/elections/google"

async function requireAccess(write = false) {
  const session = await requireAreaAdminSession()
  if (!session || !await hasPermission(session, write ? "elections:write" : "elections:read")) throw new Error("Unauthorized")
  const actor = session.user.email ?? session.user.id
  if (!actor) throw new Error("Unauthorized")
  return actor
}
function queueSync(env: CloudflareEnv, id: string) {
  after(() => syncElection(env, id))
}
export async function createElectionAction(data: unknown) {
  const actor = await requireAccess(true)
  const parsed = createElectionSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Check the election details." }
  try {
    const { env } = await getCloudflareContext({ async: true })
    const election = await createElection(env.DB, parsed.data, actor)
    queueSync(env, election.id)
    return { success: true as const, election }
  } catch {
    return { success: false as const, error: "Election creation could not be confirmed. Retry this same form before starting another election." }
  }
}
export async function saveElectionAction(data: unknown) {
  const actor = await requireAccess(true)
  const parsed = mutationSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Check the ballot totals.", conflict: false }
  try {
    const { env } = await getCloudflareContext({ async: true })
    const election = await mutateElection(env.DB, parsed.data, actor)
    queueSync(env, election.id)
    return { success: true as const, election }
  } catch (error) {
    if (error instanceof ElectionConflict) return { success: false as const, error: error.message, conflict: true }
    // Only known domain errors are shown to operators; database details stay private.
    const messages = ["This office", "Enter totals", "Candidates cannot", "Candidate names", "Only five", "Enter at least", "The fifth", "Select a remaining", "Ballot", "Expected votes", "Recorded votes", "Review the", "This save", "Election not found"]
    const message = error instanceof Error && messages.some(prefix => error.message.startsWith(prefix)) ? error.message : "Save could not be confirmed. Retry before leaving this page."
    return { success: false as const, error: message, conflict: false }
  }
}
export async function getElectionAction(id: string) {
  await requireAccess()
  const { env } = await getCloudflareContext({ async: true })
  const election = await getElection(env.DB, z.string().uuid().parse(id))
  if (election && election.syncedRevision < election.revision) queueSync(env, election.id)
  return election
}
export async function retryElectionSyncAction(id: string) {
  await requireAccess(true)
  const { env } = await getCloudflareContext({ async: true })
  const safeId = z.string().uuid().parse(id)
  await syncElection(env, safeId)
  return getElection(env.DB, safeId)
}
export async function connectElectionDriveAction() {
  await requireAccess(true)
  await signIn("google", { redirectTo: "/admin/elections" }, {
    access_type: "offline", include_granted_scopes: "true", login_hint: await getQuorumDriveOwnerEmail(), prompt: "consent", scope: `openid email profile ${GOOGLE_DRIVE_FILE_SCOPE}`,
  })
}
