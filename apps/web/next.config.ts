import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal workspace packages are shipped as TypeScript source and transpiled
  // by Next rather than pre-built to dist.
  transpilePackages: ["@all-sport/core", "@all-sport/db"],
};

export default nextConfig;
