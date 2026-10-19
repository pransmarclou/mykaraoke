import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.E2E_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: "i.ytimg.com",
      port: "",
      pathname: "/vi/*/mqdefault.jpg",
      search: "",
    }],
  },
};

export default nextConfig;
