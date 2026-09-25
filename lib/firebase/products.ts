import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type {
  AgeGroup,
  Category,
  LocalizedText,
  Product,
  ProductColor,
  ProductImage,
  ProductInput,
  ProductSize,
} from "@/lib/types";
import { DEFAULT_FOCAL_POINT } from "@/lib/types";
import { ageRangeOverlapScore } from "@/lib/sizeAge";
import { themeWordOverlapScore } from "@/lib/productTheme";

const PRODUCTS_COLLECTION = "products";

// Label given to the single color variant synthesized from a pre-colors-
// feature product's flat `images`/`sizes` fields — both here (read-time
// fallback) and in scripts/migrate-colors.mjs (the one-time write).
export const DEFAULT_COLOR_LABEL: LocalizedText = { ar: "افتراضي", en: "Default", he: "ברירת מחדל" };

/** Color labels were a plain string before they became multi-language like
 * name/description (see scripts/migrate-color-labels.mjs for the one-time
 * backfill). This read-time fallback keeps any doc the migration hasn't
 * reached yet displaying correctly — in Arabic only, everywhere — rather
 * than crashing on the old shape. */
function normalizeColorLabel(label: unknown): LocalizedText {
  if (typeof label === "string") {
    return { ar: label, en: label, he: label };
  }
  if (label && typeof label === "object") {
    const l = label as Partial<LocalizedText>;
    return { ar: l.ar ?? "", en: l.en ?? l.ar ?? "", he: l.he ?? l.ar ?? "" };
  }
  return { ar: "", en: "", he: "" };
}

/** Images were a plain URL string before focal-point cropping existed (see
 * scripts/migrate-images-focal-point.mjs for the one-time backfill). This
 * read-time fallback wraps any still-unmigrated string into the new
 * `{url, focalPoint}` shape (centered, i.e. today's existing crop behavior)
 * rather than crashing — the same pattern normalizeColorLabel() uses above
 * for the label string→LocalizedText migration. Also defends against a
 * malformed/partial focalPoint object (e.g. a doc written mid-migration). */
function normalizeProductImage(img: unknown): ProductImage {
  if (typeof img === "string") {
    return { url: img, focalPoint: DEFAULT_FOCAL_POINT };
  }
  const i = img as Partial<ProductImage> | null | undefined;
  const fp = i?.focalPoint;
  return {
    url: i?.url ?? "",
    focalPoint: {
      x: typeof fp?.x === "number" ? fp.x : DEFAULT_FOCAL_POINT.x,
      y: typeof fp?.y === "number" ? fp.y : DEFAULT_FOCAL_POINT.y,
      // Also covers a doc written by the earlier pan-only version of this
      // feature, whose focalPoint never had a `scale` field at all.
      scale: typeof fp?.scale === "number" && fp.scale > 0 ? fp.scale : DEFAULT_FOCAL_POINT.scale,
    },
  };
}

function normalizeProductImages(images: unknown): ProductImage[] {
  return Array.isArray(images) ? images.map(normalizeProductImage) : [];
}

/** Derives a product's `colors` array from raw Firestore doc data, wrapping
 * a pre-colors-feature doc's flat `images`/`sizes` (or even older single
 * `stock`) fields into one synthesized color if `colors` itself is absent.
 * Shared by toProduct() (storefront/admin reads) and placeOrder() (which
 * reads raw transaction snapshots directly, bypassing toProduct) so an
 * unmigrated product can still be browsed AND successfully ordered. */
export function deriveProductColors(data: Record<string, unknown>): ProductColor[] {
  const legacyStock = data.stock as number | undefined;
  const legacyImages = normalizeProductImages(data.images);
  const legacySizes = Array.isArray(data.sizes)
    ? (data.sizes as ProductSize[])
    : legacyStock !== undefined
      ? [{ label: "One Size", stock: Number(legacyStock) || 0 }]
      : [];
  if (Array.isArray(data.colors)) {
    return (data.colors as Array<Record<string, unknown>>).map((c) => ({
      label: normalizeColorLabel(c.label),
      images: normalizeProductImages(c.images),
      sizes: Array.isArray(c.sizes) ? (c.sizes as ProductSize[]) : [],
    }));
  }
  return legacyImages.length > 0 || legacySizes.length > 0
    ? [{ label: DEFAULT_COLOR_LABEL, images: legacyImages, sizes: legacySizes }]
    : [];
}

function toProduct(id: string, data: Record<string, unknown>): Product {
  // Legacy single-value field — kept as a defensive fallback in case any
  // doc predates the sections[]/ageGroups[] migration.
  const legacySection = data.section as string | undefined;
  const legacyAgeGroup = data.ageGroup as AgeGroup | null | undefined;

  // The `categories` field replaced `sections` (renamed alongside the old
  // "hospital" value becoming "newborn"). The migration script converts
  // every doc, but this fallback keeps reads correct even for a doc it
  // somehow missed, by reading the old field name and mapping the old value
  // on the fly.
  const rawCategories: string[] = Array.isArray(data.categories)
    ? (data.categories as string[])
    : Array.isArray(data.sections)
      ? (data.sections as string[])
      : legacySection
        ? [legacySection]
        : [];

  const categories = rawCategories.map((c) => (c === "hospital" ? "newborn" : c)) as Category[];

  // newbornGender only matters for newborn-tagged products. Any newborn
  // product saved before this field existed (or with an invalid value)
  // defaults to "unisex" so it keeps showing under all 3 newborn tabs.
  const rawNewbornGender = data.newbornGender as Product["newbornGender"];
  const newbornGender: Product["newbornGender"] = categories.includes("newborn")
    ? rawNewbornGender === "boys" || rawNewbornGender === "girls" || rawNewbornGender === "unisex"
      ? rawNewbornGender
      : "unisex"
    : rawNewbornGender;

  // Unlike newbornGender above, deliberately no fallback value — a newborn
  // product saved before this field existed (or never classified) stays
  // undefined, so it's excluded from both the Cotton/Muslin and Wool/Winter
  // sub-pages until an admin sets it, rather than guessed into one.
  const rawNewbornFabricType = data.newbornFabricType as Product["newbornFabricType"];
  const newbornFabricType: Product["newbornFabricType"] =
    rawNewbornFabricType === "cotton" || rawNewbornFabricType === "wool" ? rawNewbornFabricType : undefined;

  // Absent on any doc created before this field existed — defaults to epoch
  // (not Date.now()) so those older products never register as "new".
  const rawCreatedAt = data.createdAt as { toMillis?: () => number } | undefined;
  const createdAt = rawCreatedAt?.toMillis ? rawCreatedAt.toMillis() : 0;

  return {
    id,
    name: data.name as Product["name"],
    description: data.description as Product["description"],
    // Left undefined (not defaulted to 0) when the field is absent, so
    // display code can distinguish "no price set" from "priced at ₪0".
    price: typeof data.price === "number" ? data.price : undefined,
    salePrice: typeof data.salePrice === "number" ? data.salePrice : undefined,
    costPrice: typeof data.costPrice === "number" ? data.costPrice : undefined,
    internalCode: typeof data.internalCode === "string" ? data.internalCode : undefined,
    // `colors` replaced the old flat `images`/`sizes` fields — see
    // deriveProductColors() for the migration fallback applied here.
    colors: deriveProductColors(data),
    categories,
    newbornGender,
    newbornFabricType,
    ageGroups: Array.isArray(data.ageGroups)
      ? (data.ageGroups as AgeGroup[])
      : legacyAgeGroup
        ? [legacyAgeGroup]
        : [],
    // Missing field == visible, so products created before this field
    // existed keep showing up on the storefront exactly as before.
    isVisible: data.isVisible !== false,
    createdAt,
  };
}

/** Sum of stock across every color's sizes — the closest equivalent to the
 * old single `stock` field, used anywhere the app needs one aggregate
 * number (out-of-stock checks, admin stat cards, low-stock lists). */
export function getTotalStock(product: Pick<Product, "colors">): number {
  return product.colors.reduce((sum, c) => sum + c.sizes.reduce((s, sz) => s + sz.stock, 0), 0);
}

/** True if at least one color+size combination has 1-3 in stock — distinct
 * from getTotalStock's sum-based threshold, since a product can have plenty
 * of total stock while one specific color/size is nearly gone. */
export function isProductLowStock(product: Pick<Product, "colors">): boolean {
  return product.colors.some((c) => c.sizes.some((s) => s.stock >= 1 && s.stock <= 3));
}

/** True only when every color+size combination is at 0 stock. */
export function isProductOutOfStock(product: Pick<Product, "colors">): boolean {
  return product.colors.every((c) => c.sizes.every((s) => s.stock <= 0));
}

/** In-stock size labels for the product's first color only (the same color
 * whose image is the card's default thumbnail) — used by product cards to
 * give a general sense of what's available without needing per-color stock
 * detail (that lives on the product detail page). Deliberately scoped to
 * just colors[0] rather than a union across every color: a merged list
 * misleadingly implies sizes from different colors belong together, when
 * what's actually shown on the card is only that first color's photo. */
export function getAvailableSizeLabels(product: Pick<Product, "colors">): string[] {
  const seen = new Set<string>();
  const firstColor = product.colors[0];
  if (!firstColor) return [];
  for (const size of firstColor.sizes) {
    if (size.label.trim() && size.stock > 0) seen.add(size.label.trim());
  }
  return [...seen];
}

// Firestore can't query "isVisible == true OR field missing" in one
// constraint (an equality filter never matches an absent field), so
// customer-facing reads fetch normally and filter client-side after
// toProduct() has already applied the missing-field-means-visible fallback.

// Short-lived in-memory cache for the whole-catalog read. Several
// independent components (search bar, sale page) each call getAllProducts()
// on mount, often within the same navigation — without this, browsing
// around re-fetches the entire products collection over and over. The TTL
// keeps the storefront eventually consistent without a real-time listener;
// any admin write clears it immediately via invalidateProductCaches() so
// edits show up right away.
const CACHE_TTL_MS = 60_000;

let allProductsCache: { data: Product[]; expiresAt: number } | null = null;
let allProductsPromise: Promise<Product[]> | null = null;

function invalidateProductCaches(): void {
  allProductsCache = null;
}

export type ProductPage = {
  products: Product[];
  /** Opaque cursor for the next page — pass to the next call's `cursor`
   * param. Null once there's nothing left to page through. */
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

/** Paginated category read — category pages fetch one bounded page at a
 * time (a "Load More" button requests the next) instead of the whole
 * category in one unbounded query, so a listing page stays cheap and fast
 * to first-render even once the catalog grows to hundreds of products.
 *
 * Deliberately has no `orderBy` (falls back to Firestore's implicit
 * document-ID ordering for the `startAfter` cursor): ordering by a field
 * like `createdAt` would need a composite index AND would silently exclude
 * any product missing that field from the results entirely (Firestore's
 * behavior for docs missing the ordered-by field), which matters here since
 * plenty of products predate that field.
 *
 * Not cached — pagination's own boundedness is the main win; caching a
 * cursor-keyed sequence of pages isn't worth the complexity here. */
export async function getProductsByCategoryPage(
  category: Category,
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<ProductPage> {
  const constraints: QueryConstraint[] = [where("categories", "array-contains", category), limit(pageSize)];
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, PRODUCTS_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  const products = snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : cursor;

  return { products, lastDoc, hasMore: snap.docs.length === pageSize };
}

/** `skipCache` bypasses the module-level cache below entirely (no read, no
 * write) — for the Sale page's Server Component (see app/(site)/sale/page.tsx),
 * which needs a genuinely fresh read on every request. Without this, the
 * cache/TTL live in the SERVER's Node process, not per-visitor, so every
 * customer within the same 60s window would silently share one stale read —
 * exactly what the "no caching, always fresh" SSR requirement rules out.
 * Every existing caller (search bar, and this function's own default
 * behavior) is unaffected — they simply never pass this option. */
export async function getAllProducts(options?: { skipCache?: boolean }): Promise<Product[]> {
  if (options?.skipCache) {
    const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    return snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
  }

  const now = Date.now();
  if (allProductsCache && now < allProductsCache.expiresAt) return allProductsCache.data;

  if (!allProductsPromise) {
    allProductsPromise = (async () => {
      const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
      const data = snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
      allProductsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return data;
    })().finally(() => {
      allProductsPromise = null;
    });
  }
  return allProductsPromise;
}

// Bounded reads for pages that only need a small, visually-varied sample —
// the homepage's featured section and shop-all's curated mix used to call
// getAllProducts()/getProductsByCategory() and randomly sample from the
// *entire* result, meaning every visit re-read the whole catalog just to
// show 8-24 items. These pull a small, capped pool instead, so the read
// size stays flat as the catalog grows; callers sample from that pool.
//
// Deliberately NOT using `orderBy("createdAt", ...)` here — Firestore
// excludes documents missing the ordered-by field from the results
// entirely (not just sorts them last), and plenty of products predate that
// field, so ordering by it would silently hide older catalog items instead
// of just deprioritizing them.

export async function getFeaturedProductsPool(poolSize: number): Promise<Product[]> {
  const q = query(collection(db, PRODUCTS_COLLECTION), limit(poolSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
}

// Used by shop-all: each "Load More" round re-fetches the same category
// with a larger `poolSize` (no cursor) rather than paginating forward, so a
// doc fetched-but-not-picked in an earlier round is never lost — it just
// stays in the (growing) pool as a candidate for a future round's random
// pick, matching the initial load's own "pool of N, pick 2 at random" logic
// exactly instead of a different pagination-based one for subsequent loads.
//
// `reachedEnd` is judged on the raw doc count, *before* hidden products are
// filtered out — comparing the visible count against `poolSize` instead
// made any category with a hidden product in its pool look finished early.
export async function getProductsByCategoryPool(
  category: Category,
  poolSize: number
): Promise<{ products: Product[]; reachedEnd: boolean }> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("categories", "array-contains", category),
    limit(poolSize)
  );
  const snap = await getDocs(q);
  return {
    products: snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible),
    reachedEnd: snap.docs.length < poolSize,
  };
}

export async function getProductById(id: string): Promise<Product | null> {
  const ref = doc(db, PRODUCTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const product = toProduct(snap.id, snap.data());
  return product.isVisible ? product : null;
}

/** Admin-only lookup — unlike getProductById, does not hide products with
 * isVisible: false. Used where a hidden-but-still-existing product must be
 * distinguished from a genuinely deleted one (e.g. rendering past orders). */
export async function getProductByIdForAdmin(id: string): Promise<Product | null> {
  const ref = doc(db, PRODUCTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}

export async function getSimilarProducts(product: Product, limitCount = 4): Promise<Product[]> {
  if (product.categories.length === 0) return [];

  // Candidate pool is scoped to products sharing at least one category —
  // both the age-range and theme-word scores below only ever re-rank
  // *within* this pool, never expand it. A product with zero shared
  // categories is excluded before either of those scores is even computed.
  const q = query(collection(db, PRODUCTS_COLLECTION), where("categories", "array-contains-any", product.categories));
  const snap = await getDocs(q);
  const candidates = snap.docs
    .map((d) => toProduct(d.id, d.data()))
    .filter((p) => p.id !== product.id && p.isVisible);

  const scored = candidates.map((p) => {
    const categoryOverlap = p.categories.filter((c) => product.categories.includes(c)).length;
    // Fine-grained, size-label-derived age overlap (lib/sizeAge.ts) — the
    // same parsing/overlap logic the Boys/Girls age filter uses — replaces
    // the old broad ageGroups-array comparison.
    const ageOverlap = ageRangeOverlapScore(product, p);
    // Shared distinctive "theme" words in the Arabic name (e.g. both
    // products mention "حصان") — a secondary boost weighted below a shared
    // category (×10) but above a shared age range, so it can meaningfully
    // move a differently-categorized-but-same-theme product up the
    // ranking without ever letting theme alone outrank real category
    // relevance.
    const themeOverlap = themeWordOverlapScore(product, p);
    return { product: p, score: categoryOverlap * 10 + ageOverlap + themeOverlap * 5 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limitCount).map((s) => s.product);
}

export function subscribeToProducts(callback: (products: Product[]) => void): Unsubscribe {
  return onSnapshot(collection(db, PRODUCTS_COLLECTION), (snap) => {
    callback(snap.docs.map((d) => toProduct(d.id, d.data())));
  });
}

/** Generates a fresh product doc ref (id available before writing — used so
 * image uploads can go to Storage under the final product id). */
export function newProductRef() {
  return doc(collection(db, PRODUCTS_COLLECTION));
}

export async function createProduct(id: string, input: ProductInput): Promise<void> {
  await setDoc(doc(db, PRODUCTS_COLLECTION, id), { ...input, createdAt: serverTimestamp() });
  invalidateProductCaches();
}

/** Explicitly clears a product's price field in Firestore — omitting
 * `price` from updateProduct()'s partial input only skips writing it, it
 * doesn't remove an existing value, so an admin blanking out a wholesale
 * item's price needs this instead. */
export async function clearProductPrice(id: string): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { price: deleteField() });
  invalidateProductCaches();
}

/** Mirrors clearProductPrice() for the optional sale-price field. */
export async function clearProductSalePrice(id: string): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { salePrice: deleteField() });
  invalidateProductCaches();
}

/** Mirrors clearProductPrice() for the admin-only cost-price field. */
export async function clearProductCostPrice(id: string): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { costPrice: deleteField() });
  invalidateProductCaches();
}

/** Mirrors clearProductPrice() for the admin-only internal product code. */
export async function clearProductInternalCode(id: string): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { internalCode: deleteField() });
  invalidateProductCaches();
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), input);
  invalidateProductCaches();
}

export async function setProductVisibility(id: string, isVisible: boolean): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { isVisible });
  invalidateProductCaches();
}

/** Bulk visibility toggle for the admin table's master show-all/hide-all
 * button — applied atomically to exactly the given ids (the currently
 * filtered rows), not every product in the catalog. */
export async function setProductsVisibility(ids: string[], isVisible: boolean): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, PRODUCTS_COLLECTION, id), { isVisible }));
  await batch.commit();
  invalidateProductCaches();
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
  invalidateProductCaches();
}

export { PRODUCTS_COLLECTION };
export type { ProductInput };
