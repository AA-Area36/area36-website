"use server"

import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { requireAreaAdminSession } from "@/lib/auth/guards"
import { hasPermission } from "@/lib/auth/rbac"
import { getElection } from "@/lib/elections/store"
import { reviewOffice } from "@/lib/elections/model"
import { listQuorumEvents } from "@/lib/quorum/google"
import { quorumEventKeySchema } from "@/lib/schemas/quorum"
import { loadEligibleSeats } from "@/lib/voting/quorum"
import { getElectionRooms, getRoomAdmin, getUnusedCredentials, manageRoom, NO_CANDIDATE, openElectionRoom, openMotionRoom, VotingConflict } from "@/lib/voting/store"

async function requireAccess(write: boolean) {
  const session = await requireAreaAdminSession()
  if (!session || !await hasPermission(session, write ? "elections:write" : "elections:read")) throw new Error("Unauthorized")
  const actor = session.user.email ?? session.user.id
  if (!actor) throw new Error("Unauthorized")
  const { env } = await getCloudflareContext({ async: true })
  return { db: env.DB, actor }
}

const uuid = z.string().uuid()
const base = z.object({ id: uuid, quorumKey: quorumEventKeySchema })
const openElectionSchema = base.extend({ electionId: uuid, revision: z.number().int().nonnegative(), officeIndex: z.number().int().min(0).max(5) })
const openMotionSchema = base.extend({ title: z.string().trim().min(1).max(500) })
const operations = z.enum(["rotate", "show", "hide", "close", "publish", "unpublish"])
const failure = (error: unknown) => ({
  success: false as const,
  error: error instanceof VotingConflict ? error.message : "The voting room change could not be confirmed. Refresh or retry.",
})

export async function votingQuorumsAction() {
  await requireAccess(true)
  try {
    return { success: true as const, events: (await listQuorumEvents()).map(event => ({ key: event.eventKey, title: event.title, date: event.eventDate })) }
  } catch {
    return { success: false as const, error: "The quorum list is temporarily unavailable. Try again." }
  }
}

export async function electionRoomsAction(electionId: string) {
  const { db } = await requireAccess(false)
  return getElectionRooms(db, uuid.parse(electionId))
}

export async function openElectionRoomAction(data: unknown) {
  const { db, actor } = await requireAccess(true)
  const parsed = openElectionSchema.safeParse(data)
  if (!parsed.success) return failure(new VotingConflict("Choose a quorum and a ballot."))
  try {
    const input = parsed.data
    const election = await getElection(db, input.electionId)
    const office = election?.state.offices[input.officeIndex]
    if (!election || election.revision !== input.revision || !office || office.status !== "balloting" || reviewOffice(office).issues.length) {
      throw new VotingConflict("Refresh the election and select a ballot that is ready for votes.")
    }
    if (office.draft.some(vote => vote.online > 0) || office.draftNoCandidate.online > 0) {
      throw new VotingConflict("Clear manually entered online votes before opening a website ballot.")
    }
    const seats = await loadEligibleSeats(input.quorumKey)
    const choices = office.candidates.filter(candidate => office.eligibleIds.includes(candidate.id)).map(candidate => ({ id: candidate.id, label: candidate.name }))
    choices.push({ id: NO_CANDIDATE, label: "X / no candidate" })
    const room = await openElectionRoom(db, { ...input, actor, seats, ballotNumber: office.ballots.length + 1, title: `${election.state.title} · ${office.name}`, choices })
    return { success: true as const, room }
  } catch (error) { return failure(error) }
}

export async function openMotionRoomAction(data: unknown) {
  const { db, actor } = await requireAccess(true)
  const parsed = openMotionSchema.safeParse(data)
  if (!parsed.success) return failure(new VotingConflict("Enter a motion question and choose a quorum."))
  try {
    const prior = await getRoomAdmin(db, parsed.data.id)
    if (prior?.kind === "motion" && prior.title === parsed.data.title && prior.quorumKey === parsed.data.quorumKey) {
      return { success: true as const, room: prior }
    }
    const room = await openMotionRoom(db, { ...parsed.data, actor, seats: await loadEligibleSeats(parsed.data.quorumKey) })
    return { success: true as const, room }
  } catch (error) { return failure(error) }
}

export async function manageVotingRoomAction(id: string, operation: unknown) {
  const { db, actor } = await requireAccess(true)
  try {
    return { success: true as const, room: await manageRoom(db, uuid.parse(id), operations.parse(operation), actor) }
  } catch (error) { return failure(error) }
}

export async function motionRoomAction(id: string) {
  const { db } = await requireAccess(false)
  const room = await getRoomAdmin(db, uuid.parse(id))
  return room?.kind === "motion" ? room : null
}

export async function votingCredentialsAction(id: string) {
  const { db } = await requireAccess(true)
  try {
    return { success: true as const, credentials: await getUnusedCredentials(db, uuid.parse(id)) }
  } catch (error) { return failure(error) }
}
