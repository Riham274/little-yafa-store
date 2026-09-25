import { NextRequest } from "next/server";
import { FIREBASE_STORAGE_HOST } from "@/lib/imageProxy";

// Serves Firebase Storage images from this site's own domain — see
// lib/imageProxy.ts for why. Only ever fetches objects from this project's
// own bucket under the publicly-readable prefixes in storage.rules (the
// upstream URL is rebuilt server-side from just the object path + token, so
// this can't be used as an open proxy to arbitrary hosts).
//
// Uploaded objects are never mutated in place (every upload gets a new
// timestamped filename — see lib/firebase/storage.ts), so each proxy URL's
// bytes never change and the response is cached for a year by both the
// browser and Vercel's CDN. After the first customer requests an image, the
// CDN answers everyone else directly without invoking this function.

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const ALLOWED_PREFIXES = ["products/", "site-settings/"];
const LONG_CACHE = "public, max-age=31536000, immutable";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  const token = request.nextUrl.searchParams.get("token");

  if (!BUCKET || !ALLOWED_PREFIXES.some((p) => path.startsWith(p)) || path.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const upstreamUrl = new URL(`https://${FIREBASE_STORAGE_HOST}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}`);
  upstreamUrl.searchParams.set("alt", "media");
  if (token) upstreamUrl.searchParams.set("token", token);

  let upstream: Response;
  try {
    // no-store: the CDN caches the finished response (headers below), so
    // there's no point also copying every image into Next's data cache.
    upstream = await fetch(upstreamUrl, { cache: "no-store" });
  } catch {
    return new Response("Upstream fetch failed", { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.startsWith("image/")) {
    // Short cache so a transient Storage hiccup doesn't stick, while a
    // genuinely missing image doesn't hammer the function either.
    return new Response("Not found", {
      status: upstream.status >= 500 ? 502 : 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": LONG_CACHE,
    "CDN-Cache-Control": LONG_CACHE,
    "X-Content-Type-Options": "nosniff",
  });
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);

  return new Response(upstream.body, { status: 200, headers });
}
