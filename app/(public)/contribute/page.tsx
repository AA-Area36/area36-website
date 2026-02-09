import type { Metadata } from "next"
import { ContributeClient } from "./contribute-client"

export const metadata: Metadata = {
  title: "Contribute | Area 36",
  description:
    "Support Area 36 through the Seventh Tradition. Learn how to contribute to A.A. General Service in southern Minnesota.",
}

export default function ContributePage() {
  return <ContributeClient />
}

