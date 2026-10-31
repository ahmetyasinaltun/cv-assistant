// Next.js build and runtime settings: caching mode, Server Action body limit, CSS loader and security headers.

import type { NextConfig } from "next";

/**
 * Sent with every page. No other site may frame these pages (the sign-in form cannot be overlaid by a
 * clickjacking page), browsers must not guess content types, other sites see only the origin in the referrer,
 * and the pages never ask for the camera, microphone or location.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // CV PDFs may be up to 5 MB (the API's limit); leave room for the posting text and form overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
