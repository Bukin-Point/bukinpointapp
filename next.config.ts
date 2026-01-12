import type { NextConfig } from "next";

const remotePatterns: Array<{ protocol: 'https'; hostname: string }> = [
  {
    protocol: 'https',
    hostname: '**.r2.dev',
  },
  {
    protocol: 'https',
    hostname: '**.r2.cloudflarestorage.com',
  },
];

// Allow custom R2 domains
if (process.env.CLOUDFLARE_R2_PUBLIC_URL) {
  try {
    const url = new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL);
    remotePatterns.push({
      protocol: 'https',
      hostname: url.hostname,
    });
  } catch {
    // Invalid URL, skip
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
