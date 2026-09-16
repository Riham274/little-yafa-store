// One-time migration: converts each existing product's `colors[].images`
// entries from plain URL strings into
// `{ url, focalPoint: { x: 50, y: 50, scale: 1 } }` objects — the new shape
// needed by the image focal-point/crop-zoom feature. `{x:50, y:50, scale:1}`
// (centered, unzoomed) is exactly the crop every image was already showing
// before this feature existed, so this migration changes nothing visible on
// its own; it just gives every image an explicit, editable focal point/zoom
// the admin can now adjust per photo.
//
// Not required for correctness — lib/firebase/products.ts's
// normalizeProductImage() (used by deriveProductColors()) already wraps any
// still-unmigrated string image (or an image saved by the earlier pan-only
// version of this feature, whose focalPoint had no `scale` field) into the
// same shape at read time, so unmigrated products keep displaying with
// their existing centered/unzoomed crop even if this script is never run.
// Run it only if you want the actual Firestore documents to hold the new
// shape (e.g. so a Firestore Console view of the data reflects it, or
// before removing the read-time fallback someday).
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node scripts/migrate-images-focal-point.mjs [--dry-run]
//
// Requires an admin account (lib/firebase/auth.ts / the `admins` Firestore
// collection) — the products collection's security rules only allow this
// kind of write from an authenticated admin. Uses the same client SDK and
// .env.local config as the app itself, no service account needed. Safe to
// re-run: any image that already has a numeric `focalPoint.scale` is left
// untouched.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FOCAL_POINT = { x: 50, y: 50, scale: 1 };
const dryRun = process.argv.includes("--dry-run");

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  const text = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

// Wraps a legacy string URL; passes an already-migrated {url, focalPoint}
// object through unchanged (defensively re-normalizing a malformed/partial
// focalPoint, same as the app's own read-time normalizer).
function normalizeImage(img) {
  if (typeof img === "string") {
    return { url: img, focalPoint: { ...DEFAULT_FOCAL_POINT } };
  }
  const fp = img?.focalPoint;
  return {
    url: img?.url ?? "",
    focalPoint: {
      x: typeof fp?.x === "number" ? fp.x : DEFAULT_FOCAL_POINT.x,
      y: typeof fp?.y === "number" ? fp.y : DEFAULT_FOCAL_POINT.y,
      scale: typeof fp?.scale === "number" && fp.scale > 0 ? fp.scale : DEFAULT_FOCAL_POINT.scale,
    },
  };
}

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars (an account listed in the `admins` Firestore collection) before running.");
    process.exit(1);
  }

  const env = loadEnvLocal();
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`Signed in as ${ADMIN_EMAIL}.${dryRun ? " (dry run — no writes will be made)" : ""}`);

  const snap = await getDocs(collection(db, "products"));
  let migrated = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const colors = Array.isArray(data.colors) ? data.colors : [];

    // Only worth writing back if at least one image anywhere in this
    // product is still a plain string, or an object saved by the earlier
    // pan-only version of this feature (no numeric `scale` field yet) —
    // otherwise every image already has the current shape and there's
    // nothing to change.
    const needsMigration = colors.some(
      (c) =>
        Array.isArray(c.images) &&
        c.images.some((img) => typeof img === "string" || typeof img?.focalPoint?.scale !== "number")
    );
    if (!needsMigration) {
      skipped++;
      continue;
    }

    const newColors = colors.map((c) => ({
      ...c,
      images: Array.isArray(c.images) ? c.images.map(normalizeImage) : [],
    }));

    const imageCount = newColors.reduce((sum, c) => sum + c.images.length, 0);
    console.log(`  migrate ${docSnap.id} — ${imageCount} image(s) across ${newColors.length} color(s)`);

    if (!dryRun) {
      await updateDoc(doc(db, "products", docSnap.id), { colors: newColors });
    }
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, already-migrated/skipped: ${skipped}, total: ${snap.size}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
