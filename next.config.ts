import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    // AVIF first (smaller than WebP at equivalent quality), falling back to
    // WebP (Next's default) for browsers that don't support it — the
    // optimizer picks per-request from the browser's Accept header, so this
    // only ever helps, never regresses a browser that lacks AVIF support.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
