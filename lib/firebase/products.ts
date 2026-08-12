import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { AgeGroup, Category, Product, ProductInput, ProductSize } from "@/lib/types";

const PRODUCTS_COLLECTION = "products";

function toProduct(id: string, data: Record<string, unknown>): Product {
  // Legacy single-value field — kept as a defensive fallback in case any
  // doc predates the sections[]/ageGroups[] migration.
  const legacySection = data.section as string | undefined;
  const legacyAgeGroup = data.ageGroup as AgeGroup | null | undefined;

  // Legacy single `stock` number — docs that predate the sizes[] migration
  // are collapsed into a single "One Size" entry so they keep working until
  // the one-time migration script (or an admin edit) converts them properly.
  const legacyStock = data.stock as number | undefined;

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

  return {
    id,
    name: data.name as Product["name"],
    description: data.description as Product["description"],
    // Left undefined (not defaulted to 0) when the field is absent, so
    // display code can distinguish "no price set" from "priced at ₪0".
    price: typeof data.price === "number" ? data.price : undefined,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    categories,
    newbornGender,
    ageGroups: Array.isArray(data.ageGroups)
      ? (data.ageGroups as AgeGroup[])
      : legacyAgeGroup
        ? [legacyAgeGroup]
        : [],
    sizes: Array.isArray(data.sizes)
      ? (data.sizes as ProductSize[])
      : legacyStock !== undefined
        ? [{ label: "One Size", stock: Number(legacyStock) || 0 }]
        : [],
    // Missing field == visible, so products created before this field
    // existed keep showing up on the storefront exactly as before.
    isVisible: data.isVisible !== false,
  };
}

/** Sum of stock across all sizes — the closest equivalent to the old
 * single `stock` field, used anywhere the app needs one aggregate number
 * (out-of-stock checks, admin stat cards, low-stock lists). */
export function getTotalStock(product: Pick<Product, "sizes">): number {
  return product.sizes.reduce((sum, s) => sum + s.stock, 0);
}

/** Per-size stock status, used by the admin Stock filter — distinct from
 * getTotalStock's sum-based threshold, since a product can have plenty of
 * total stock while one specific size is nearly gone. */
export function isProductLowStock(product: Pick<Product, "sizes">): boolean {
  return product.sizes.some((s) => s.stock >= 1 && s.stock <= 3);
}

export function isProductOutOfStock(product: Pick<Product, "sizes">): boolean {
  return product.sizes.every((s) => s.stock <= 0);
}

// Firestore can't query "isVisible == true OR field missing" in one
// constraint (an equality filter never matches an absent field), so
// customer-facing reads fetch normally and filter client-side after
// toProduct() has already applied the missing-field-means-visible fallback.

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const q = query(collection(db, PRODUCTS_COLLECTION), where("categories", "array-contains", category));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
}

export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snap.docs.map((d) => toProduct(d.id, d.data())).filter((p) => p.isVisible);
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
  await setDoc(doc(db, PRODUCTS_COLLECTION, id), input);
}

/** Explicitly clears a product's price field in Firestore — omitting
 * `price` from updateProduct()'s partial input only skips writing it, it
 * doesn't remove an existing value, so an admin blanking out a wholesale
 * item's price needs this instead. */
export async function clearProductPrice(id: string): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { price: deleteField() });
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), input);
}

export async function setProductVisibility(id: string, isVisible: boolean): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), { isVisible });
}

/** Bulk visibility toggle for the admin table's master show-all/hide-all
 * button — applied atomically to exactly the given ids (the currently
 * filtered rows), not every product in the catalog. */
export async function setProductsVisibility(ids: string[], isVisible: boolean): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, PRODUCTS_COLLECTION, id), { isVisible }));
  await batch.commit();
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
}

export { PRODUCTS_COLLECTION };
export type { ProductInput };
