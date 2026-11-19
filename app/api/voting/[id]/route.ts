import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { getPublicRoom } from "@/lib/voting/store"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "no-store", "CDN-Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return Response.json(null, { status: 404, headers })
  try {
    const { env } = await getCloudflareContext({ async: true })
    const room = await getPublicRoom(env.DB, id)
    return Response.json(room, { headers })
  } catch {
    return Response.json(null, { status: 503, headers })
  }
}
