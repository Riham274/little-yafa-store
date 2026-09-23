"use client";

import { useEffect, useMemo, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import SortSelect from "@/components/product/SortSelect";

// ISR/caching pilot: a Shoes-specific rewrite that deliberately does NOT
// use CategoryPageContent (still used, unchanged, by the other 12 category
// pages) and deliberately never calls useSearchParams()/useRouter().
//
// Why this was necessary: this page has none of the URL-param-driven
// filters the shared component supports for other categories — Shoes has
// always passed showAgeFilter={false} and left showSizeAgeFilter/
// showGenderFilter at their default-off values, so age/size/gender
// filtering was never actually reachable here. Sort has always been plain
// local state, never URL-driven, so it was never part of the problem
// either. But CategoryPageContent calls useSearchParams() unconditionally
// (needed by the OTHER pages' filters), and Next.js requires any component
// using that hook to sit inside a Suspense boundary — under static
// generation/ISR (export const revalidate below), Next.js can't know the
// request's search params at build time, so it bakes the Suspense
// *fallback* into the cached HTML instead of real content, deferring
// everything to client-side hydration. That's a real regression (no more
// content for JS-disabled visitors/crawlers, and a hydration-driven content
// swap that's itself a CLS risk) for a page that never needed the hook's
// value in the first place. Removing the dependency entirely — rather than
// working around Suspense — is what actually lets this page be both
// genuinely cached AND render real content in the initial HTML.
export default function ShoesPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortOption | null>(null);

  useEffect(() => {
    // The server already sent this page's first batch (initialProducts,
    // rendered directly into the cached HTML) — this fetch exists purely to
    // get a real pagination cursor for "Load More": getProductsByCategoryPage()'s
    // cursor (lastDoc) is a raw Firestore QueryDocumentSnapshot, which can't
    // cross the server→client boundary as a prop. Its `products` result is
    // deliberately unused — the already-displayed initial page is left
    // untouched, so this never causes a visible re-render/flash.
    getProductsByCategoryPage("shoes", CATEGORY_PAGE_SIZE, null).then((page) => {
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    });
  }, []);

  // Only re-sort when the admin has actually picked a sort option —
  // otherwise (the default state) the list must stay in whatever order it
  // was fetched/appended in. See CategoryPageContent's identical comment
  // for why: falling back to a default sort here would re-sort the *entire*
  // accumulated list on every "Load More" append, reshuffling products
  // already on screen.
  const sorted = useMemo(() => (sort ? sortProducts(products, sort) : products), [products, sort]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    getProductsByCategoryPage("shoes", CATEGORY_PAGE_SIZE, cursor)
      .then((page) => {
        setProducts((prev) => [...prev, ...page.products]);
        setCursor(page.lastDoc);
        setHasMore(page.hasMore);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.shoesTitle}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm flex-wrap">
        <div className="flex items-center gap-sm sm:ms-auto">
          <SortSelect value={sort} onChange={setSort} className="self-end sm:self-auto" />
        </div>
      </div>

      <div className="mt-lg">
        {sorted.length === 0 ? (
          <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
        ) : (
          <ProductGrid products={sorted} />
        )}
        {hasMore && (
          <div className="flex justify-center mt-lg">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-lg py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50"
            >
              {loadingMore && (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              )}
              {t.category.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
