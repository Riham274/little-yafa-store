"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsByCategoryPool } from "@/lib/firebase/products";
import { pickRandom } from "@/lib/random";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import type { Category, Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import SortSelect from "@/components/product/SortSelect";
import PageLoader from "@/components/ui/PageLoader";

const ALL_CATEGORIES: Category[] = [
  "boys",
  "girls",
  "newborn",
  "new-in",
  "gift-wrapping",
  "wholesale",
  "blankets",
  "accessories",
  "bath",
  "shoes",
  "dresses",
  "winter",
];
const PER_CATEGORY = 2;
// Bounded per-category pool instead of the whole catalog (see
// getProductsByCategoryPool()'s comment) — 12 small parallel reads instead
// of one that grows with total catalog size.
const CATEGORY_POOL_SIZE = 6;

// ~2 random products per category, deduped (a product can satisfy more than
// one category) and reshuffled so the final order isn't grouped by category.
async function fetchCuratedMix(): Promise<Product[]> {
  const pools = await Promise.all(
    ALL_CATEGORIES.map((category) => getProductsByCategoryPool(category, CATEGORY_POOL_SIZE))
  );
  const picked = new Map<string, Product>();
  for (const pool of pools) {
    for (const product of pickRandom(pool, PER_CATEGORY)) {
      picked.set(product.id, product);
    }
  }
  const combined = [...picked.values()];
  return pickRandom(combined, combined.length);
}

export default function ShopAllPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [sort, setSort] = useState<SortOption | null>(null);

  useEffect(() => {
    fetchCuratedMix().then(setProducts);
  }, []);

  const sorted = useMemo(
    () => (products ? sortProducts(products, sort ?? "newest") : []),
    [products, sort]
  );

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.shopAllTitle}
      </h1>

      {products !== null && products.length > 0 && (
        <div className="flex justify-end mb-lg">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}

      {products === null ? (
        <PageLoader />
      ) : sorted.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
      ) : (
        <ProductGrid products={sorted} />
      )}
    </div>
  );
}
