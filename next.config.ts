import type { NextConfig } from "next";

// A tunnelled host (cloudflared, ngrok) is a cross-origin dev client, and Next
// refuses to serve it /_next assets unless the host is named. Kept in the env
// so an ephemeral tunnel URL never lands in a committed file.
const devOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

// Set when tunnelling and in production. The browser then calls /api on this
// app and Next forwards it to the API, so everything stays on one origin — no
// CORS, and no tunnel hostname to add to the API's ALLOWED_HOSTS. Unset in
// normal dev, where the browser calls the API's published port itself.
const apiProxy = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Emits .next/standalone, which the production Docker stage runs.
  output: "standalone",
  allowedDevOrigins: devOrigins,
  ...(apiProxy && {
    // Matching drops the trailing slash and Django appends it straight back,
    // which redirects forever. Every endpoint here ends in one, so it is put
    // back on the way out instead.
    skipTrailingSlashRedirect: true,
    // Photos need no rule: the API hands back signed S3 links.
    rewrites: async () => [
      { source: "/api/:path*", destination: `${apiProxy}/api/:path*/` },
    ],
  }),
};

export default nextConfig;
