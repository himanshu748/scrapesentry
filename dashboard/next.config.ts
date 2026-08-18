import type { NextConfig } from "next";

const apiTarget = process.env.API_INTERNAL_HOSTPORT
  ? `http://${process.env.API_INTERNAL_HOSTPORT}`
  : "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
