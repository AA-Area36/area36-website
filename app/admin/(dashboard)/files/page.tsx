import { AdminFilesLoader } from "./files-loader"

// Page loads instantly - GDrive data is lazy loaded on client
// This prevents Worker resource limits from being exceeded at build time

export default function AdminFilesPage() {
  return <AdminFilesLoader />
}
