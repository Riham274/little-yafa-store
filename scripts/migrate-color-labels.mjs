// One-time migration: converts each existing product's color `label` field
// from a plain string (the Arabic text the admin originally typed) into a
// multi-language object `{ ar, en, he }`, translating the existing text into
// English and Hebrew via the same Google Cloud Translation API the admin
// product form uses.
//
// Not required for correctness — lib/firebase/products.ts's
// normalizeColorLabel() (used by deriveProductColors()) already treats a
// plain-string label as { ar: label, en: label, he: label } at read time, so
// unmigrated products keep displaying (in Arabic only, for every language)
// rather than crashing even if this script is never run. Run it to get real
// English/Hebrew color names instead of that Arabic-only fallback.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node scripts/migrate-color-labels.mjs [--dry-run]
//
// Requires an admin account (lib/firebase/auth.ts / the `admins` Firestore
// collection) — the products collection's security rules only allow this
// kind of write from an authenticated admin. Uses the same client SDK and
// .env.local config as the app itself, no service account needed. Safe to
// re-run: colors whose label is already an object are skipped.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

// Mirrors app/api/translate/route.ts's request shape, called directly
// against Google's API (not through the Next.js route) so this script
// doesn't depend on a running dev/prod server.
async function translateBatch(apiKey, texts, target) {
  const form = new URLSearchParams();
  texts.forEach((text) => form.append("q", text));
  form.set("target", target);
  form.set("source", "ar");
  form.set("format", "text");

  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`Translation request failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return (data?.data?.translations ?? []).map((t) => t.translatedText);
}

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars (an account listed in the `admins` Firestore collection) before running.");
    process.exit(1);
  }

  const env = loadEnvLocal();
  const apiKey = env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_TRANSLATE_API_KEY is not set in .env.local.");
    process.exit(1);
  }

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

    const pending = colors
      .map((c, i) => ({ i, text: typeof c.label === "string" ? c.label : null }))
      .filter((p) => p.text !== null && p.text.trim() !== "");

    if (pending.length === 0) {
      skipped++;
      continue;
    }

    const arTexts = pending.map((p) => p.text);
    console.log(`  migrate ${docSnap.id} — ${arTexts.length} color label(s): ${arTexts.join(", ")}`);

    let enTexts = arTexts;
    let heTexts = arTexts;
    if (!dryRun) {
      [enTexts, heTexts] = await Promise.all([
        translateBatch(apiKey, arTexts, "en"),
        translateBatch(apiKey, arTexts, "he"),
      ]);
    }

    const newColors = colors.map((c, i) => {
      const p = pending.findIndex((p) => p.i === i);
      if (p === -1) return c; // already an object — leave untouched
      return { ...c, label: { ar: arTexts[p], en: enTexts[p], he: heTexts[p] } };
    });

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
