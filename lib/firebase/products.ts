import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { AgeGroup, Product, ProductInput, Section } from "@/lib/types";

const PRODUCTS_COLLECTION = "products";

function toProduct(id: string, data: Record<string, unknown>): Product {
  // Legacy single-value fields — kept as a defensive fallback in case any
  // doc predates the sections[]/ageGroups[] migration.
  const legacySection = data.section as Section | undefined;
  const legacyAgeGroup = data.ageGroup as AgeGroup | null | undefined;

  return {
    id,
    name: data.name as Product["name"],
    description: data.description as Product["description"],
    price: Number(data.price) || 0,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    sections: Array.isArray(data.sections)
      ? (data.sections as Section[])
      : legacySection
        ? [legacySection]
        : [],
    ageGroups: Array.isArray(data.ageGroups)
      ? (data.ageGroups as AgeGroup[])
      : legacyAgeGroup
        ? [legacyAgeGroup]
        : [],
    category: (data.category as string) ?? "",
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    stock: Number(data.stock) || 0,
  };
}

export async function getProductsBySection(section: Section): Promise<Product[]> {
  const q = query(collection(db, PRODUCTS_COLLECTION), where("sections", "array-contains", section));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toProduct(d.id, d.data()));
}

export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snap.docs.map((d) => toProduct(d.id, d.data()));
}

export async function getProductById(id: string): Promise<Product | null> {
  const ref = doc(db, PRODUCTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}

export async function getSimilarProducts(product: Product, limitCount = 4): Promise<Product[]> {
  const q = query(collection(db, PRODUCTS_COLLECTION), where("category", "==", product.category));
  const snap = await getDocs(q);
  const candidates = snap.docs
    .map((d) => toProduct(d.id, d.data()))
    .filter((p) => p.id !== product.id);

  const scored = candidates.map((p) => {
    const overlap = p.tags.filter((tag) => product.tags.includes(tag)).length;
    return { product: p, overlap };
  });

  scored.sort((a, b) => b.overlap - a.overlap);
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

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), input);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
}

export { PRODUCTS_COLLECTION };
export type { ProductInput };
