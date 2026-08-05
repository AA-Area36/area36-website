import type { Metadata } from "next"
import { AreaAssemblyArchive } from "./area-assembly-archive"

export const metadata: Metadata = {
  title: "April 2026 Area Assembly Archive | Area 36",
  description:
    "Archived information for the concluded April 2026 Area Assembly and Delegates Workshop.",
}

export default function AreaAssemblyRegistrationPage() {
  return <AreaAssemblyArchive />
}
