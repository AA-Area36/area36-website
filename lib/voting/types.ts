export type VotingChoice = { id: string; label: string }
export type VotingResult = VotingChoice & { votes: number }

export type PublicVotingRoom = {
  id: string
  title: string
  kind: "election" | "motion"
  status: "open" | "closed"
  ballotNumber: number | null
  roomCode: string | null
  choices: VotingChoice[]
  results: VotingResult[] | null
}

export type RoomAdmin = Omit<PublicVotingRoom, "roomCode" | "results" | "choices"> & {
  version: number
  quorumKey: string
  officeIndex: number | null
  roomCode: string
  showCode: boolean
  resultsPublished: boolean
  eligible: number
  received: number
  results: VotingResult[] | null
}
export type RoomCredential = { label: string; code: string }
export const NO_CANDIDATE = "no-candidate"
export const MOTION_CHOICES = [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "abstain", label: "Abstain" }]
export const voteRoomPath = (id: string) => `/vote/${id}`
