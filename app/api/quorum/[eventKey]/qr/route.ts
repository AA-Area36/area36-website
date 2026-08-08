import QRCode from "qrcode"
import { getQuorumEventByKey } from "@/lib/quorum/google"

type RouteContext = { params: Promise<{ eventKey: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const { eventKey } = await params
  const event = await getQuorumEventByKey(eventKey).catch(() => null)
  if (!event) return new Response("Not found", { status: 404 })
  const requestUrl = new URL(request.url)
  const formUrl = `${requestUrl.origin}/quorum/${event.eventKey}`
  const svg = await QRCode.toString(formUrl, {
    type: "svg",
    width: 1024,
    margin: 3,
    color: { dark: "#0d3554", light: "#ffffff" },
    errorCorrectionLevel: "M",
  })
  const download = requestUrl.searchParams.get("download") === "1"
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${event.eventDate}-quorum-qr.svg"`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
