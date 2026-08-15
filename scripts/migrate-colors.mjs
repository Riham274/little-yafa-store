// One-time migration: converts each existing product's flat `images` +
// `sizes` fields into a single color variant `colors: [{ label: "افتراضي",
// images, sizes }]`, then removes the old `images`/`sizes` fields.
//
// Not required for correctness — lib/firebase/products.ts's
// deriveProductColors() already synthesizes the same shape on every read
// (and lib/firebase/orders.ts's placeOrder() does the same before writing
// back a decrement), so unmigrated products keep displaying and selling
// exactly as before even if this script is never run. Run it only if you
// want to actually clean up the old fields in Firestore.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node scripts/migrate-colors.mjs [--dry-run]
//
// Requires an admin account (lib/firebase/auth.ts / the `admins` Firestore
// collection) — the products collection's security rules only allow this
// kind of write from an authenticated admin. Uses the same client SDK and
// .env.local config as the app itself, no service account needed.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_COLOR_LABEL = "افتراضي";
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

    if (Array.isArray(data.colors)) {
      skipped++;
      continue;
    }

    const legacyImages = Array.isArray(data.images) ? data.images : [];
    const legacySizes = Array.isArray(data.sizes)
      ? data.sizes
      : typeof data.stock === "number"
        ? [{ label: "One Size", stock: data.stock }]
        : [];

    if (legacyImages.length === 0 && legacySizes.length === 0) {
      console.log(`  skip ${docSnap.id} — no images/sizes/stock to migrate`);
      skipped++;
      continue;
    }

    const colors = [{ label: DEFAULT_COLOR_LABEL, images: legacyImages, sizes: legacySizes }];
    console.log(`  migrate ${docSnap.id} — ${legacyImages.length} image(s), ${legacySizes.length} size(s)`);

    if (!dryRun) {
      await updateDoc(doc(db, "products", docSnap.id), {
        colors,
        images: deleteField(),
        sizes: deleteField(),
      });
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
