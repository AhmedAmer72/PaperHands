import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["paperhands-simulator"],
  // The simulator package lives next to this app. Trace from the repo root so
  // the linked package is included when Vercel builds with Root Directory set to frontend.
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

export default nextConfig;
