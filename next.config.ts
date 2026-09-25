import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    // Product/banner images are served through /api/image-proxy (see
    // lib/imageProxy.ts), whose URLs carry a query string. Inert while
    // `unoptimized` is true, but next/image's optimizer rejects local srcs
    // with query strings unless they're listed here — so this keeps the
    // proxy working if `unoptimized` is ever reverted. The second entry
    // keeps every other local image (public/ files) allowed as before.
    localPatterns: [{ pathname: "/api/image-proxy" }, { pathname: "/**", search: "" }],
    // AVIF first (smaller than WebP at equivalent quality), falling back to
    // WebP (Next's default) for browsers that don't support it — the
    // optimizer picks per-request from the browser's Accept header, so this
    // only ever helps, never regresses a browser that lacks AVIF support.
    // Currently inert while `unoptimized` below is true (no optimization
    // pipeline runs at all, so there's no format negotiation to configure)
    // — left in place rather than removed, so it's already correct again
    // the moment `unoptimized` is reverted.
    formats: ["image/avif", "image/webp"],
    // Disables Vercel's on-demand image optimization/transformation
    // pipeline entirely: next/image renders each product/admin/gallery
    // image's original URL directly (still via the same <Image> components,
    // same fill/sizes/priority props — nothing in application code changes)
    // instead of proxying it through /_next/image for server-side resizing
    // and AVIF/WebP re-encoding. Trades that automatic per-device resizing
    // and format negotiation away — every visitor now downloads the
    // original file, whatever size/format it was uploaded as (webp, ~1600px
    // max per compressForUpload() in lib/firebase/storage.ts) — in exchange
    // for eliminating "Image Optimization" transformation usage/billing
    // entirely, at zero infrastructure cost.
    unoptimized: true,
  },
};

export default nextConfig;
