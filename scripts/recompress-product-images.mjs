// One-time fix: re-compresses existing product images that were stored far
// larger than intended. compressForUpload() (lib/firebase/storage.ts) always
// asked the browser for WebP, but Safari can't encode WebP from a canvas and
// silently returned a lossless PNG instead — so every photo uploaded from the
// admin's iPhone was stored as a 1-4MB PNG (despite its .webp filename). With
// next.config.ts's `images.unoptimized: true`, customers download those
// originals as-is, which is a real problem on slow mobile connections.
//
// For each product image that is a PNG or larger than SIZE_THRESHOLD, this
// downloads it, re-encodes it as a real WebP with sharp (same dimensions —
// they're already ≤1600px — so focal points/crops are unaffected), uploads it
// as a NEW Storage object next to the original, and points the product's
// Firestore doc at the new URL (each image's focalPoint is kept as-is).
//
// Old files are deliberately NOT deleted: customers' saved carts
// (localStorage) still reference the old URLs, and keeping them makes
// `--rollback` possible. They cost next to nothing to keep.
//
// Usage:
//   node scripts/recompress-product-images.mjs --dry-run [--sample 25]
//       No sign-in needed (products are publicly readable). Checks every
//       image's size/type and actually re-encodes a sample (in memory only)
//       to project the savings. Writes nothing.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node scripts/recompress-product-images.mjs
//       Real run. Writes a log (old URL → new URL for every image) to your
//       home folder. Safe to re-run: already-small WebP images are skipped.
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/recompress-product-images.mjs --rollback <log.json>
//       Points every product back at its original URLs from that log.
//
// Avoid editing products in the admin panel while it runs — each product is
// updated in a transaction that only swaps image URLs, but an edit saved
// mid-run could still re-save the old URLs for that one product (re-running
// the script would then simply fix it).

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import sharp from "sharp";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, runTransaction } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rollbackIdx = args.indexOf("--rollback");
const rollbackLog = rollbackIdx >= 0 ? args[rollbackIdx + 1] : null;
const sampleIdx = args.indexOf("--sample");
const SAMPLE = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) : 25;

const SIZE_THRESHOLD = 500 * 1024;
const WEBP_QUALITY = 80;
const CONCURRENCY = 4;
const LONG_CACHE_CONTROL = "public, max-age=31536000, immutable";

function loadEnvLocal() {
  const text = readFileSync(join(__dirname, "..", ".env.local"), "utf-8");
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

const imageUrl = (img) => (typeof img === "string" ? img : img?.url);

// Every image URL a product doc references — colors[].images plus the legacy
// top-level `images` field (see deriveProductColors in lib/firebase/products.ts).
function imageUrlsOf(data) {
  const urls = [];
  for (const c of Array.isArray(data.colors) ? data.colors : []) {
    for (const img of Array.isArray(c.images) ? c.images : []) if (imageUrl(img)) urls.push(imageUrl(img));
  }
  for (const img of Array.isArray(data.images) ? data.images : []) if (imageUrl(img)) urls.push(imageUrl(img));
  return urls;
}

// Swaps URLs per `mapping`, keeping each entry's shape (plain string vs
// {url, focalPoint}) and everything else about the doc untouched.
function remapImages(data, mapping) {
  const swap = (img) => {
    const url = imageUrl(img);
    if (!url || !mapping.has(url)) return img;
    return typeof img === "string" ? mapping.get(url) : { ...img, url: mapping.get(url) };
  };
  const update = {};
  if (Array.isArray(data.colors)) {
    update.colors = data.colors.map((c) => (Array.isArray(c.images) ? { ...c, images: c.images.map(swap) } : c));
  }
  if (Array.isArray(data.images)) update.images = data.images.map(swap);
  return update;
}

// "products/<id>/1790362344305-IMG_8457.webp" → { productId, baseName: "IMG_8457" }
function parseStoragePath(url) {
  const path = decodeURIComponent(new URL(url).pathname.split("/o/")[1] ?? "");
  const [, productId, fileName] = path.match(/^products\/([^/]+)\/(.+)$/) ?? [];
  if (!productId) return null;
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/^\d{13}-/, "").replace(/-c$/, "");
  return { productId, baseName };
}

async function head(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return { bytes: Number(res.headers.get("content-length")) || 0, type: res.headers.get("content-type") ?? "" };
    } catch {}
  }
  return null;
}

async function download(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {}
  }
  throw new Error(`download failed: ${url}`);
}

async function reencode(buffer) {
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return out;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    })
  );
  return results;
}

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)}MB`;

// Applies a URL mapping to every product that references any mapped URL (a
// photo can be shared by more than one product). One transaction per
// product: re-reads the doc and swaps only those URLs, leaving every other
// field as it currently is.
async function applyMapping(db, mapping) {
  const snap = await getDocs(collection(db, "products"));
  let updated = 0;
  let failed = 0;
  for (const d of snap.docs) {
    if (!imageUrlsOf(d.data()).some((u) => mapping.has(u))) continue;
    try {
      await runTransaction(db, async (tx) => {
        const s = await tx.get(d.ref);
        if (s.exists()) tx.update(s.ref, remapImages(s.data(), mapping));
      });
      updated++;
    } catch (err) {
      failed++;
      console.error(`  FAILED updating product ${d.id}: ${err.message}`);
    }
  }
  return { updated, failed };
}

async function main() {
  const env = loadEnvLocal();
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const db = getFirestore(app);

  if (!dryRun) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars (an account listed in the `admins` Firestore collection), or pass --dry-run.");
      process.exit(1);
    }
    await signInWithEmailAndPassword(getAuth(app), ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log(`Signed in as ${ADMIN_EMAIL}.`);
  }

  // ---- Rollback: point products back at the original URLs from a log ----
  if (rollbackLog) {
    const entries = JSON.parse(readFileSync(rollbackLog, "utf-8"));
    const { updated, failed } = await applyMapping(db, new Map(entries.map((e) => [e.newUrl, e.oldUrl])));
    console.log(`\nRollback done: ${updated} product(s) restored. Failures: ${failed}.`);
    process.exit(failed ? 1 : 0);
  }

  const storage = getStorage(app);
  const snap = await getDocs(collection(db, "products"));
  const images = [];
  for (const d of snap.docs) for (const url of imageUrlsOf(d.data())) images.push({ docId: d.id, url });
  const unique = [...new Map(images.map((i) => [i.url, i])).values()];
  console.log(`${snap.size} products, ${unique.length} distinct image URLs. Checking sizes…`);

  const heads = await mapLimit(unique, 16, (img) => head(img.url));
  const todo = [];
  let totalBefore = 0;
  let unreachable = 0;
  unique.forEach((img, i) => {
    const h = heads[i];
    if (!h) return unreachable++;
    totalBefore += h.bytes;
    if (h.type === "image/png" || h.bytes > SIZE_THRESHOLD) todo.push({ ...img, ...h });
  });
  const todoBytes = todo.reduce((s, t) => s + t.bytes, 0);
  console.log(
    `Total now ${mb(totalBefore)}. Needing re-compression: ${todo.length} image(s), ${mb(todoBytes)}.` +
      (unreachable ? ` (${unreachable} unreachable — skipped)` : "")
  );

  if (dryRun) {
    const sample = todo.filter((_, i) => i % Math.max(1, Math.floor(todo.length / SAMPLE)) === 0).slice(0, SAMPLE);
    let inBytes = 0;
    let outBytes = 0;
    await mapLimit(sample, CONCURRENCY, async (t) => {
      const buf = await download(t.url);
      const { data, info } = await reencode(buf);
      inBytes += buf.length;
      outBytes += data.length;
      console.log(`  sample ${t.docId}: ${mb(buf.length)} ${t.type} → ${(data.length / 1024).toFixed(0)}KB webp ${info.width}x${info.height}`);
    });
    const ratio = outBytes / inBytes;
    console.log(
      `\nDry run — nothing written. Sample of ${sample.length}: ${mb(inBytes)} → ${mb(outBytes)} (${(ratio * 100).toFixed(1)}%).` +
        ` Projected: ${mb(todoBytes)} → ~${mb(todoBytes * ratio)} across ${todo.length} images.`
    );
    process.exit(0);
  }

  // ---- Real run ----
  const log = [];
  const logPath = join(homedir(), `little-yafa-recompress-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const saveLog = () => writeFileSync(logPath, JSON.stringify(log, null, 2));
  let failed = 0;
  let done = 0;

  await mapLimit(todo, CONCURRENCY, async (t) => {
    try {
      const parsed = parseStoragePath(t.url);
      if (!parsed) throw new Error("not a products/<id>/<file> Storage URL");
      const buf = await download(t.url);
      const { data, info } = await reencode(buf);
      if (data.length >= buf.length) {
        console.log(`  skip (no gain) ${t.docId} ${parsed.baseName}`);
        return;
      }
      const newPath = `products/${parsed.productId}/${Date.now()}-${parsed.baseName}-c.webp`;
      const newRef = ref(storage, newPath);
      await uploadBytes(newRef, data, { contentType: "image/webp", cacheControl: LONG_CACHE_CONTROL });
      const newUrl = await getDownloadURL(newRef);
      log.push({ productId: t.docId, oldUrl: t.url, newUrl, oldBytes: buf.length, newBytes: data.length, width: info.width, height: info.height });
      saveLog();
      done++;
      console.log(`  [${done}/${todo.length}] ${t.docId} ${parsed.baseName}: ${mb(buf.length)} → ${(data.length / 1024).toFixed(0)}KB`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${t.docId} ${t.url}: ${err.message}`);
    }
  });

  const applied = await applyMapping(db, new Map(log.map((e) => [e.oldUrl, e.newUrl])));
  const updated = applied.updated;
  failed += applied.failed;

  const before = log.reduce((s, e) => s + e.oldBytes, 0);
  const after = log.reduce((s, e) => s + e.newBytes, 0);
  console.log(
    `\nDone. Re-compressed ${log.length} image(s): ${mb(before)} → ${mb(after)}. Updated ${updated} product(s). Failures: ${failed}.` +
      `\nLog (needed for --rollback): ${logPath}\nOld files were kept in Storage.`
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("Re-compression failed:", err);
  process.exit(1);
});
