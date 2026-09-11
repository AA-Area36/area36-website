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
      // Header rules are applied in order. The preview endpoint is embedded
      // only by this site's PDF viewer, so override the default DENY policy
      // after the site-wide security headers have been applied.
      {
        source: "/api/files/preview/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
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
