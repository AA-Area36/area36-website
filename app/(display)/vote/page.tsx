import { VotingShell } from "./voting-shell"
import { JoinForm } from "./join-form"

export const metadata = { title: "Join a vote | Area 36", robots: { index: false, follow: false } }

export default function JoinVotingPage() {
  return <VotingShell><h1 className="font-serif text-4xl tracking-tight">Join a vote</h1>
    <p className="mt-3 text-muted-foreground">Enter the room code shared by the teller.</p>
    <JoinForm />
  </VotingShell>
}
