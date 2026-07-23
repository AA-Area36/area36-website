import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { BROWSER_SECURITY_HEADERS } from "./lib/security/browser-headers";

initOpenNextCloudflareForDev();

const districtServerActionOrigins = Array.from({ length: 27 }, (_, index) => index + 1)
  .filter((districtNumber) => districtNumber !== 10)
  .map((districtNumber) => `d${districtNumber}.area36.org`);

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...BROWSER_SECURITY_HEADERS],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["area36.org", "www.area36.org", ...districtServerActionOrigins],
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
