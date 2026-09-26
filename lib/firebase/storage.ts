import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { app } from "./config";

// Admin-only — see the comment in config.ts for why this lives here instead
// of being initialized alongside `db`.
export const storage = getStorage(app);

// Long-lived cache header for product photos — they're never mutated in
// place (edits/deletes create new Storage objects/URLs), so a returning
// visitor's browser/CDN can keep serving its cached copy indefinitely.
const LONG_CACHE_CONTROL = "public, max-age=31536000, immutable";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Resizes to a web-appropriate max dimension and re-encodes before upload,
 * so product photos straight off a phone camera (often several MB, 4000px+)
 * don't get stored and served at their original size. Falls back to the
 * original file untouched if compression fails for any reason (e.g. an
 * unsupported format) rather than blocking the upload.
 *
 * WebP first, but the result's *actual* type is checked rather than
 * assumed: Safari can't encode WebP from a canvas and silently hands back a
 * lossless PNG instead — which is how every product photo uploaded from the
 * admin's iPhone ended up stored as a 1-4MB PNG (named .webp). When that
 * happens, photos are re-encoded as JPEG (supported everywhere, ~10x
 * smaller than that PNG). `allowJpeg: false` keeps the PNG instead for
 * images that need transparency (the seasonal category icon). */
async function compressForUpload(
  file: File,
  { allowJpeg = true }: { allowJpeg?: boolean } = {}
): Promise<{ blob: Blob; contentType: string; extension: string }> {
  const options = { maxWidthOrHeight: 1600, initialQuality: 0.8, useWebWorker: true };
  try {
    let compressed: Blob = await imageCompression(file, { ...options, fileType: "image/webp" });
    if (compressed.type !== "image/webp" && allowJpeg) {
      compressed = await imageCompression(file, { ...options, fileType: "image/jpeg" });
    }
    const extension = EXTENSION_BY_TYPE[compressed.type];
    if (!extension) throw new Error(`Unexpected compressed type: ${compressed.type}`);
    return { blob: compressed, contentType: compressed.type, extension };
  } catch {
    const extension = file.name.split(".").pop() ?? "jpg";
    return { blob: file, contentType: file.type || "image/jpeg", extension };
  }
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const { blob, contentType, extension } = await compressForUpload(file);
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const fileName = `${Date.now()}-${baseName}.${extension}`;
  const storageRef = ref(storage, `products/${productId}/${fileName}`);
  await uploadBytes(storageRef, blob, { contentType, cacheControl: LONG_CACHE_CONTROL });
  return getDownloadURL(storageRef);
}

/** Replaces the site's homepage hero banner image — used from the admin
 * settings page, not tied to any product. */
export async function uploadHeroBannerImage(file: File): Promise<string> {
  const { blob, contentType, extension } = await compressForUpload(file);
  const fileName = `hero-banner-${Date.now()}.${extension}`;
  const storageRef = ref(storage, `site-settings/${fileName}`);
  await uploadBytes(storageRef, blob, { contentType, cacheControl: LONG_CACHE_CONTROL });
  return getDownloadURL(storageRef);
}

/** Replaces the seasonal category card's icon (see lib/firebase/siteSettings.ts) — used
 * from the admin settings page, same site-settings/ Storage path as the hero banner. */
export async function uploadSeasonalCategoryIcon(file: File): Promise<string> {
  // Icons are drawn on a transparent background — JPEG would fill it black.
  const { blob, contentType, extension } = await compressForUpload(file, { allowJpeg: false });
  const fileName = `seasonal-category-icon-${Date.now()}.${extension}`;
  const storageRef = ref(storage, `site-settings/${fileName}`);
  await uploadBytes(storageRef, blob, { contentType, cacheControl: LONG_CACHE_CONTROL });
  return getDownloadURL(storageRef);
}

/** Deletes any Storage file by its download URL — generic, not tied to a
 * particular collection (used for both product images and site-settings
 * images like the hero banner). */
export async function deleteStorageFile(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // File may already be gone or URL wasn't a Storage ref — non-fatal.
  }
}
