import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone, which the production Docker stage runs.
  output: "standalone",
};

export default nextConfig;
