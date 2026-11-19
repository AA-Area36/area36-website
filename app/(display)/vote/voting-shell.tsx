import Link from "next/link"
import { Vote } from "lucide-react"

export function VotingShell({ children }: { children: React.ReactNode }) {
  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-muted/25 px-4 pb-16 pt-7 sm:px-8">
    <div className="mx-auto max-w-xl">
      <header className="mb-9 flex items-center gap-3 border-b pb-5 text-sm">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold"><Vote className="size-5 text-primary" />Area 36</Link>
        <span className="border-l pl-3 text-muted-foreground">Assembly voting</span>
      </header>
      {children}
    </div>
  </main>
}
