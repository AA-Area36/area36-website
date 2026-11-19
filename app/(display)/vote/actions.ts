"use server"

import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"
import { castVote, findRoomByCode, normalizeVotingCode } from "@/lib/voting/store"

const roomCode = z.string().max(30).transform(normalizeVotingCode).pipe(z.string().regex(/^[0-9A-F]{8}$/))
const voterCode = z.string().max(40).transform(normalizeVotingCode).pipe(z.string().regex(/^[0-9A-F]{16}$/))
const ballot = z.object({ id: z.string().uuid(), roomCode, voterCode, choiceId: z.string().min(1).max(40), receipt: z.string().uuid() })

async function canTry(operation: "join" | "cast") {
  const limit = await checkRateLimit(`assembly-vote-${operation}:${await getClientIp()}`, { limit: 240, windowMs: 60_000 })
  return limit.ok
}

export async function joinVotingRoomAction(input: unknown) {
  const code = roomCode.safeParse(input)
  if (!code.success) return { error: "Enter the eight-character room code." }
  try {
    if (!await canTry("join")) return { error: "Please wait a minute and try again." }
    const { env } = await getCloudflareContext({ async: true })
    const room = await findRoomByCode(env.DB, code.data)
    return room ? { room } : { error: "This room code is invalid or the room has closed." }
  } catch { return { error: "The voting room is temporarily unavailable." } }
}

export async function castVoteAction(input: unknown) {
  const parsed = ballot.safeParse(input)
  if (!parsed.success) return { error: "Enter both codes and select a choice." }
  try {
    if (!await canTry("cast")) return { error: "Please wait a minute and try again.", retry: true }
    const { env } = await getCloudflareContext({ async: true })
    if (await castVote(env.DB, parsed.data)) return { success: true as const }
    return { error: "The vote was not accepted. Check both codes and make sure this ballot is still open. Each voter code can be used once." }
  } catch { return { error: "We couldn’t confirm your vote. Retry this submission.", retry: true } }
}
