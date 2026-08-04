import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sentinel-desk/types"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
  },
};

export default nextConfig;
