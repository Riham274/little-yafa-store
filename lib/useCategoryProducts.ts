"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import { useListingCache } from "@/lib/listingCache";
import { orderBatch, type SortOption } from "@/lib/sortProducts";
import type { Category, Product } from "@/lib/types";

type SavedListing = {
  products: Product[];
  hasMore: boolean;
  sort: SortOption | null;
  lastId: string | null;
};

// A page of only hidden products yields nothing to show; keep reading ahead
// (up to this many pages) so one "Load More" click always adds something
// while there's anything left.
const MAX_EMPTY_PAGES = 5;

/** Products for a paginated category listing, in a stable display order:
 * each "Load More" batch is ordered on its own (the chosen sort, then
 * out-of-stock last — see orderBatch) and appended AFTER what's already on
 * screen, so loading more never moves or reshuffles products the customer
 * has already seen. Only picking a sort option re-orders the whole list,
 * since that's an explicit request to.
 *
 * `initialProducts` is the server-rendered first page (ISR). When it's
 * omitted (e.g. the Winter page), the first page is fetched here instead,
 * and re-fetched whenever `category` changes.
 *
 * Filters stay with the page: they're applied to `products` for display
 * (in this same order), not baked into it. */
export function useCategoryProducts(category: Category, initialProducts?: Product[]) {
  // Coming BACK to this listing (e.g. from a product page): rebuild exactly
  // what was loaded before — every "Load More" page, in the same order, with
  // the same sort — on this very first render, so useScrollRestoration can
  // scroll the customer back to the product they came from. See
  // lib/listingCache.ts. Any other visit starts at page 1 as usual.
  const { restored, save: saveToCache } = useListingCache<SavedListing>(`category:${category}`);

  const [products, setProducts] = useState<Product[]>(() => restored?.products ?? orderBatch(initialProducts ?? [], null));
  const [loading, setLoading] = useState(!restored && !initialProducts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(restored?.hasMore ?? false);
  const [sort, setSortState] = useState<SortOption | null>(restored?.sort ?? null);

  // Cursor = the last product ID read so far, in Firestore's (document-ID)
  // order — NOT the last product in display order, which a sort changes.
  // Starting from the server page's own last product means page 2 always
  // continues from exactly what's on screen.
  const lastIdRef = useRef<string | null>(
    restored
      ? restored.lastId
      : initialProducts && initialProducts.length > 0
        ? initialProducts[initialProducts.length - 1].id
        : null
  );
  const sortRef = useRef<SortOption | null>(restored?.sort ?? null);
  // Bumped whenever the list is reset (category change), so a response for
  // the previous category arriving late is ignored.
  const generationRef = useRef(0);
  // The category whose list came from the Back cache, if any — its first
  // load is skipped. Compared by category (not a one-shot flag) so React's
  // development double-run of effects doesn't refetch and wipe it.
  const restoredCategoryRef = useRef<Category | null>(restored ? category : null);

  // Keep the saved copy current, so Back always finds the latest state.
  useEffect(() => {
    saveToCache({ products, hasMore, sort, lastId: lastIdRef.current });
  }, [saveToCache, products, hasMore, sort]);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (restoredCategoryRef.current === category) {
      // Restored from the Back cache: the list, cursor and hasMore are all
      // already known — nothing to fetch.
      return;
    }
    restoredCategoryRef.current = null;
    if (initialProducts) {
      // The first page is already on screen; one single-document read after
      // its last product is enough to know whether "Load More" should show.
      getProductsByCategoryPage(category, 1, lastIdRef.current).then((probe) => {
        if (generation === generationRef.current) setHasMore(probe.hasMore);
      });
      return;
    }
    setLoading(true);
    setProducts([]);
    setHasMore(false);
    lastIdRef.current = null;
    getProductsByCategoryPage(category, CATEGORY_PAGE_SIZE, null)
      .then((page) => {
        if (generation !== generationRef.current) return;
        lastIdRef.current = page.lastId;
        setProducts(orderBatch(page.products, sortRef.current));
        setHasMore(page.hasMore);
      })
      .finally(() => {
        if (generation === generationRef.current) setLoading(false);
      });
    // initialProducts is only ever read at mount (whether the server sent a
    // first page doesn't change across this component's lifetime).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    const generation = generationRef.current;
    setLoadingMore(true);
    try {
      let fresh: Product[] = [];
      let more = true;
      for (let i = 0; i < MAX_EMPTY_PAGES && more && fresh.length === 0; i++) {
        const page = await getProductsByCategoryPage(category, CATEGORY_PAGE_SIZE, lastIdRef.current);
        if (generation !== generationRef.current) return;
        lastIdRef.current = page.lastId;
        more = page.hasMore;
        fresh = page.products;
      }
      setProducts((prev) => {
        const shown = new Set(prev.map((p) => p.id));
        return [...prev, ...orderBatch(fresh.filter((p) => !shown.has(p.id)), sortRef.current)];
      });
      setHasMore(more);
    } finally {
      if (generation === generationRef.current) setLoadingMore(false);
    }
  }, [category, hasMore, loadingMore]);

  const setSort = useCallback((next: SortOption) => {
    sortRef.current = next;
    setSortState(next);
    setProducts((prev) => orderBatch(prev, next));
  }, []);

  return { products, loading, loadingMore, hasMore, loadMore, sort, setSort };
}
