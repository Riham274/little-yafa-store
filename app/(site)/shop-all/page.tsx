"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// How much each category's pool grows per round (initial load included) —
// re-fetched from scratch each round rather than paginated forward, so a
// doc that was fetched but not randomly picked in an earlier round stays
// available as a candidate for a later one instead of being lost to a
// cursor that's already moved past it.
const POOL_STEP = 6;

type CategoryMap<T> = Partial<Record<Category, T>>;

export default function ShopAllPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [sort, setSort] = useState<SortOption | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  // Session-scoped, not reactive state — only ever read/written from within
  // fetchBatch; the actual re-render happens via the products/exhausted
  // state each batch resolves into.
  const shownIds = useRef<Set<string>>(new Set());
  const poolLimit = useRef<CategoryMap<number>>({});
  const categoryExhausted = useRef<CategoryMap<boolean>>({});

  // Exactly 2 random products per category, every round — the same rule for
  // the initial load and every "Load More" click, just against a bigger
  // pool each time. A category contributes fewer than 2 (or none) once it
  // genuinely runs out, without affecting any other category.
  const fetchBatch = useCallback(async (): Promise<{ products: Product[]; allExhausted: boolean }> => {
    const activeCategories = ALL_CATEGORIES.filter((c) => !categoryExhausted.current[c]);
    if (activeCategories.length === 0) return { products: [], allExhausted: true };

    const results = await Promise.all(
      activeCategories.map(async (category) => {
        const nextLimit = (poolLimit.current[category] ?? 0) + POOL_STEP;
        poolLimit.current[category] = nextLimit;
        const pool = await getProductsByCategoryPool(category, nextLimit);
        // Firestore returned fewer docs than asked for — this category has
        // no more products at all, visible or not, beyond what's already
        // been fetched.
        if (pool.length < nextLimit) categoryExhausted.current[category] = true;
        return { category, pool };
      })
    );

    const picked = new Map<string, Product>();
    for (const { pool } of results) {
      // A product can satisfy more than one category, so it may already be
      // picked by another category this same round.
      const fresh = pool.filter((p) => !shownIds.current.has(p.id) && !picked.has(p.id));
      for (const product of pickRandom(fresh, PER_CATEGORY)) {
        picked.set(product.id, product);
      }
    }

    picked.forEach((_, id) => shownIds.current.add(id));
    const allExhausted = ALL_CATEGORIES.every((c) => categoryExhausted.current[c]);
    return { products: pickRandom([...picked.values()], picked.size), allExhausted };
  }, []);

  useEffect(() => {
    fetchBatch().then(({ products: batch, allExhausted }) => {
      setProducts(batch);
      setExhausted(allExhausted);
    });
  }, [fetchBatch]);

  const handleLoadMore = () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    fetchBatch()
      .then(({ products: batch, allExhausted }) => {
        setProducts((prev) => [...(prev ?? []), ...batch]);
        setExhausted(allExhausted);
      })
      .finally(() => setLoadingMore(false));
  };

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
        <>
          <ProductGrid products={sorted} />
          <div className="flex justify-center mt-lg">
            {exhausted ? (
              <p className="font-body-md text-on-surface-variant text-center">{t.category.allProductsSeen}</p>
            ) : (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-lg py-3 rounded-full border border-outline-variant font-label-md text-label-md text-on-surface hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                {loadingMore && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                )}
                {t.category.loadMore}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
