import type { NextConfig } from "next";

// A tunnelled host (cloudflared, ngrok) is a cross-origin dev client, and Next
// refuses to serve it /_next assets unless the host is named. Kept in the env
// so an ephemeral tunnel URL never lands in a committed file.
const devOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  // Emits .next/standalone, which the production Docker stage runs.
  output: "standalone",
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
