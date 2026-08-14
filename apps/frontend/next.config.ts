import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained apps/frontend/.next/standalone/ build with only the
  // node_modules it actually needs traced in - what the Dockerfile copies into the
  // final image, instead of shipping the whole monorepo's node_modules.
  output: "standalone",
  transpilePackages: ["@sentinel-desk/types"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
  },
};

export default nextConfig;
