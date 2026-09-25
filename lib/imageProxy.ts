// Rewrites Firebase Storage download URLs to go through the site's own
// /api/image-proxy route (app/api/image-proxy/route.ts), so customers'
// browsers only ever need to reach this domain — some customers' ISPs fail
// to reach firebasestorage.googleapis.com at all, even though the page
// itself (served from this domain) loads fine for them.
//
// Render-time only: Firestore keeps storing the original download URL, so
// anything that needs the real Storage reference (deleteStorageFile's
// ref(storage, url), the product form's url-keyed image lists) is untouched.
// Anything that isn't a Firebase Storage URL for this project's bucket
// (local /public files, blob: previews of not-yet-uploaded files, other
// hosts) is returned unchanged, so this is safe to wrap around any src.

export const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";
export const IMAGE_PROXY_PATH = "/api/image-proxy";

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

export function proxiedImageUrl(src: string): string;
export function proxiedImageUrl(src: string | undefined | null): string | undefined | null;
export function proxiedImageUrl(src: string | undefined | null) {
  if (!src || !BUCKET || !src.startsWith(`https://${FIREBASE_STORAGE_HOST}/`)) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  // Download URLs look like /v0/b/<bucket>/o/<url-encoded object path>
  const prefix = `/v0/b/${BUCKET}/o/`;
  if (!url.pathname.startsWith(prefix)) return src;

  let objectPath: string;
  try {
    objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return src;
  }
  if (!objectPath) return src;

  const params = new URLSearchParams({ path: objectPath });
  const token = url.searchParams.get("token");
  if (token) params.set("token", token);
  return `${IMAGE_PROXY_PATH}?${params.toString()}`;
}
