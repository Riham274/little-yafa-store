import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { storage } from "./config";

// Long-lived cache header for product photos — they're never mutated in
// place (edits/deletes create new Storage objects/URLs), so a returning
// visitor's browser/CDN can keep serving its cached copy indefinitely.
const LONG_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Resizes to a web-appropriate max dimension and re-encodes as WebP before
 * upload, so product photos straight off a phone camera (often several MB,
 * 4000px+) don't get stored and served at their original size. Falls back
 * to the original file untouched if compression fails for any reason (e.g.
 * an unsupported format) rather than blocking the upload. */
async function compressForUpload(file: File): Promise<{ blob: Blob; contentType: string; extension: string }> {
  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 1600,
      initialQuality: 0.8,
      fileType: "image/webp",
      useWebWorker: true,
    });
    return { blob: compressed, contentType: compressed.type || "image/webp", extension: "webp" };
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

export async function deleteProductImage(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // Image may already be gone or URL wasn't a Storage ref — non-fatal.
  }
}
