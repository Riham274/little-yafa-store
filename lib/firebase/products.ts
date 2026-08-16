import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { AgeGroup, Category, Product, ProductColor, ProductInput, ProductSize } from "@/lib/types";

const PRODUCTS_COLLECTION = "products";

// Label given to the single color variant synthesized from a pre-colors-
// feature product's flat `images`/`sizes` fields — both here (read-time
// fallback) and in scripts/migrate-colors.mjs (the one-time write).
export const DEFAULT_COLOR_LABEL = "افتراضي";

/** Derives a product's `colors` array from raw Firestore doc data, wrapping
 * a pre-colors-feature doc's flat `images`/`sizes` (or even older single
 * `stock`) fields into one synthesized color if `colors` itself is absent.
 * Shared by toProduct() (storefront/admin reads) and placeOrder() (which
 * reads raw transaction snapshots directly, bypassing toProduct) so an
 * unmigrated product can still be browsed AND successfully ordered. */
export function deriveProductColors(data: Record<string, unknown>): ProductColor[] {
  const legacyStock = data.stock as number | undefined;
  const legacyImages = Array.isArray(data.images) ? (data.images as string[]) : [];
  const legacySizes = Array.isArray(data.sizes)
    ? (data.sizes as ProductSize[])
    : legacyStock !== undefined
      ? [{ label: "One Size", stock: Number(legacyStock) || 0 }]
      : [];
  return Array.isArray(data.colors)
    ? (data.colors as ProductColor[])
    : legacyImages.length > 0 || legacySizes.length > 0
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
    // `colors` replaced the old flat `images`/`sizes` fields — see
    // deriveProductColors() for the migration fallback applied here.
    colors: deriveProductColors(data),
    categories,
    newbornGender,
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

// Firestore can't query "isVisible == true OR field missing" in one
// constraint (an equality filter never matches an absent field), so
// customer-facing reads fetch normally and filter client-side after
// toProduct() has already applied the missing-field-means-visible fallback.

// Short-lived in-memory cache for the two whole-catalog reads. Several
// independent components (search bar, featured section, shop-all, sale
// page, every category page) each call these on mount, often within the
// same navigation — without this, browsing around re-fetches the entire
// products collection over and over. The TTL keeps the storefront eventually
// consistent without a real-time listener; any admin write clears it
// immediately via invalidateProductCaches() so edits show up right away.
const CACHE_TTL_MS = 60_000;

let allProductsCache: { data: Product[]; expiresAt: number } | null = null;
let allProductsPromise: Promise<Product[]> | null = null;
const categoryCache = new Map<Category, { data: Product[]; expiresAt: number }>();
const categoryPromises = new Map<Category, Promise<Product[]>>();

function invalidateProductCaches(): void {
  allProductsCache = null;
  categoryCache.clear();
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const now = Date.now();
  const cached = categoryCache.get(category);
  if (cached && now < cached.expiresAt) return cached.data;

  let pending = categoryPromises.get(category);
  if (!pending) {
    pending = (async () => {
      const q = query(collection(db, PRODUCTS_COLLECTION), where("categories", "array-contains", category));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
      categoryCache.set(category, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })().finally(() => categoryPromises.delete(category));
    categoryPromises.set(category, pending);
  }
  return pending;
}

export async function getAllProducts(): Promise<Product[]> {
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

  const q = query(collection(db, PRODUCTS_COLLECTION), where("categories", "array-contains-any", product.categories));
  const snap = await getDocs(q);
  const candidates = snap.docs
    .map((d) => toProduct(d.id, d.data()))
    .filter((p) => p.id !== product.id && p.isVisible);

  const scored = candidates.map((p) => {
    const categoryOverlap = p.categories.filter((c) => product.categories.includes(c)).length;
    const ageOverlap = p.ageGroups.filter((age) => product.ageGroups.includes(age)).length;
    return { product: p, score: categoryOverlap * 10 + ageOverlap };
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
