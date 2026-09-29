"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsByCategoryPool } from "@/lib/firebase/products";
import { useListingCache } from "@/lib/listingCache";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import { pickRandom } from "@/lib/random";
import { orderBatch, type SortOption } from "@/lib/sortProducts";
import type { Category, Product } from "@/lib/types";
import LoadMoreButton from "@/components/product/LoadMoreButton";
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

type SavedShopAll = {
  products: Product[];
  sort: SortOption | null;
  exhausted: boolean;
  shownIds: Set<string>;
  poolLimit: CategoryMap<number>;
  pools: CategoryMap<Product[]>;
  fetchedAll: CategoryMap<boolean>;
};

export default function ShopAllPage() {
  useScrollRestoration();
  const { t } = useLanguage();
  // Coming BACK here from a product: rebuild exactly the products that had
  // been loaded (and where the random picking had got to), on this first
  // render, so scroll restoration can return to the same spot — see
  // lib/listingCache.ts. Any other visit starts a fresh random selection.
  const { restored, save: saveToCache } = useListingCache<SavedShopAll>("shop-all");
  const [products, setProducts] = useState<Product[] | null>(restored?.products ?? null);
  const [sort, setSort] = useState<SortOption | null>(restored?.sort ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(restored?.exhausted ?? false);

  // Session-scoped, not reactive state — only ever read/written from within
  // fetchBatch; the actual re-render happens via the products/exhausted
  // state each batch resolves into.
  const shownIds = useRef<Set<string>>(restored?.shownIds ?? new Set());
  const poolLimit = useRef<CategoryMap<number>>(restored?.poolLimit ?? {});
  // Latest fetched pool per category, kept so a category whose Firestore
  // results have run out can keep contributing its not-yet-shown products
  // on later rounds without being re-queried.
  const pools = useRef<CategoryMap<Product[]>>(restored?.pools ?? {});
  // Firestore has returned every doc in this category — no point growing
  // its pool further. NOT the same as the category being done: it's only
  // done once its pool also has nothing left that hasn't been shown.
  const fetchedAll = useRef<CategoryMap<boolean>>(restored?.fetchedAll ?? {});

  useEffect(() => {
    if (products === null) return;
    saveToCache({
      products,
      sort,
      exhausted,
      shownIds: shownIds.current,
      poolLimit: poolLimit.current,
      pools: pools.current,
      fetchedAll: fetchedAll.current,
    });
  }, [saveToCache, products, sort, exhausted]);

  const hasUnshown = (category: Category) =>
    (pools.current[category] ?? []).some((p) => !shownIds.current.has(p.id));
  const isDone = (category: Category) => !!fetchedAll.current[category] && !hasUnshown(category);

  // Exactly 2 random products per category, every round — the same rule for
  // the initial load and every "Load More" click, just against a bigger
  // pool each time. A category contributes fewer than 2 (or none) once it
  // genuinely runs out, without affecting any other category.
  //
  // Previously a category was dropped the moment Firestore returned fewer
  // docs than requested, even though only 2 of its (up to POOL_STEP more)
  // fetched products had been shown — so most of each category was never
  // reached, and the "seen everything" message appeared after roughly a
  // quarter of the catalog.
  const fetchBatch = useCallback(async (): Promise<{ products: Product[]; allExhausted: boolean }> => {
    // Loops only in the rare case a round turns up nothing new (e.g. every
    // unshown product in the pools so far was already shown via another
    // category) while some category can still grow — so a "Load More"
    // click never comes back empty-handed short of true exhaustion.
    for (;;) {
      const activeCategories = ALL_CATEGORIES.filter((c) => !isDone(c));
      if (activeCategories.length === 0) return { products: [], allExhausted: true };

      await Promise.all(
        activeCategories
          .filter((c) => !fetchedAll.current[c])
          .map(async (category) => {
            const nextLimit = (poolLimit.current[category] ?? 0) + POOL_STEP;
            poolLimit.current[category] = nextLimit;
            const { products: pool, reachedEnd } = await getProductsByCategoryPool(category, nextLimit);
            pools.current[category] = pool;
            if (reachedEnd) fetchedAll.current[category] = true;
          })
      );

      const picked = new Map<string, Product>();
      for (const category of activeCategories) {
        // A product can satisfy more than one category, so it may already be
        // picked by another category this same round.
        const fresh = (pools.current[category] ?? []).filter((p) => !shownIds.current.has(p.id) && !picked.has(p.id));
        for (const product of pickRandom(fresh, PER_CATEGORY)) {
          picked.set(product.id, product);
        }
      }

      picked.forEach((_, id) => shownIds.current.add(id));
      const allExhausted = ALL_CATEGORIES.every(isDone);
      if (picked.size > 0 || allExhausted) {
        return { products: pickRandom([...picked.values()], picked.size), allExhausted };
      }
    }
    // isDone/hasUnshown only read refs, so they're stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `products` is kept in display order: each batch is ordered on its own
  // (the chosen sort, then out-of-stock last — see orderBatch) and appended
  // after what's already shown, so "Load More" never moves products already
  // on screen. Only picking a sort re-orders the whole list. Same approach
  // as the category pages (lib/useCategoryProducts.ts).
  const sortRef = useRef<SortOption | null>(restored?.sort ?? null);

  useEffect(() => {
    // Restored from the Back cache — the first batch (and any more) is
    // already on screen.
    if (restored) return;
    fetchBatch().then(({ products: batch, allExhausted }) => {
      setProducts(orderBatch(batch, sortRef.current));
      setExhausted(allExhausted);
    });
  }, [fetchBatch, restored]);

  const handleLoadMore = () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    fetchBatch()
      .then(({ products: batch, allExhausted }) => {
        setProducts((prev) => [...(prev ?? []), ...orderBatch(batch, sortRef.current)]);
        setExhausted(allExhausted);
      })
      .finally(() => setLoadingMore(false));
  };

  const handleSortChange = (next: SortOption) => {
    sortRef.current = next;
    setSort(next);
    setProducts((prev) => (prev ? orderBatch(prev, next) : prev));
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.shopAllTitle}
      </h1>

      {products !== null && products.length > 0 && (
        <div className="flex justify-end mb-lg">
          <SortSelect value={sort} onChange={handleSortChange} />
        </div>
      )}

      {products === null ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
      ) : (
        <>
          <ProductGrid products={products} />
          {exhausted ? (
            <p className="font-body-md text-on-surface-variant text-center mt-lg">{t.category.allProductsSeen}</p>
          ) : (
            <LoadMoreButton onClick={handleLoadMore} loading={loadingMore} />
          )}
        </>
      )}
    </div>
  );
}
