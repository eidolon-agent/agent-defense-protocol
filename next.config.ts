import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    workerMemoryBufferMB: 512,
  },
};

export default nextConfig;
