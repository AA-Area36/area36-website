import { AdminFilesLoader } from "./files-loader"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Files" }

// Page loads instantly - GDrive data is lazy loaded on client
// This prevents Worker resource limits from being exceeded at build time

export default function AdminFilesPage() {
  return <AdminFilesLoader />
}
