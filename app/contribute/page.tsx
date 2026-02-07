import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ContributeClient } from "./contribute-client"

export default function ContributePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ContributeClient />
      <Footer />
    </div>
  )
}

