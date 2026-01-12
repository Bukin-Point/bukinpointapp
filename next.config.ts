import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      // Allow custom R2 domains
      ...(process.env.CLOUDFLARE_R2_PUBLIC_URL
        ? [
            {
              protocol: 'https',
              hostname: new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).hostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
