import { notFound } from "next/navigation"
import { Inter } from "next/font/google"
import { DistrictShell } from "./district-shell"
import { coerceDistrict, resolveDistrictSiteForRender } from "./district-utils"

const districtDisplay = Inter({
  subsets: ["latin"],
  variable: "--font-district-display",
  weight: ["400", "500", "600", "700"],
})

const districtBody = Inter({
  subsets: ["latin"],
  variable: "--font-district-body",
  weight: ["400", "500", "600", "700"],
})

export const dynamic = "force-dynamic"

export default async function DistrictLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const site = await resolveDistrictSiteForRender(districtNumber)
  if (!site) notFound()

  const { title, previewMode } = site

  return (
    <div className={`${districtDisplay.variable} ${districtBody.variable}`}>
      <DistrictShell districtNumber={districtNumber} title={title} previewMode={previewMode}>
        {children}
      </DistrictShell>
    </div>
  )
}
