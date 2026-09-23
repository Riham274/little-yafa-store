"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import { productMatchesSizeAgeFilter, type SizeAgeFilter } from "@/lib/sizeAge";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import SizeAgeFilterSelect from "@/components/product/SizeAgeFilterSelect";
import SortSelect from "@/components/product/SortSelect";

// ISR/caching pilot (fuller pattern): Bath-specific rewrite that, unlike
// CategoryPageContent (still used, unchanged, by every other category page
// with a size-age filter), never calls useSearchParams(). That hook is what
// forces a component into client-only rendering under static generation/ISR
// — Next.js can't know the request's query string at build/cache time, so
// it bakes the Suspense *fallback* into the cached HTML instead of real
// content, deferring everything (not just the filter) to client-side
// hydration. This page's filter genuinely IS URL-driven (unlike Shoes/Sale,
// which needed no rewrite at all), so the fix here is different: read the
// URL's `sizeAge` param via plain browser APIs (window.location.search)
// instead of the hook. That read is invisible to Next's static-generation
// dynamic-API tracking, so the grid itself renders unconditionally — a
// visitor with no filter in the URL sees the full cached grid instantly; a
// visitor arriving via a filtered link sees the same instant grid then a
// near-instant, no-network re-filter of that already-loaded data once the
// mount effect below reads the real URL, rather than a loading state.
export default function BathPageClient({ initialProducts }: { initialProducts: Product[] }) {
  useScrollRestoration();
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortOption | null>(null);
  // Starts null — matching what the cached HTML always shows, since the
  // real URL's query string can't be known at build/cache time — and is
  // corrected from the actual URL immediately on mount below.
  const [activeSizeAge, setActiveSizeAge] = useState<SizeAgeFilter | null>(null);

  useEffect(() => {
    const readFilterFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveSizeAge((params.get("sizeAge") as SizeAgeFilter | null) ?? null);
    };
    readFilterFromUrl();
    // window.location.search isn't itself reactive — without this, a
    // browser back/forward navigation (or any other same-page URL change)
    // wouldn't be noticed at all.
    window.addEventListener("popstate", readFilterFromUrl);
    return () => window.removeEventListener("popstate", readFilterFromUrl);
  }, []);

  useEffect(() => {
    // The server already sent this page's first batch (initialProducts,
    // rendered directly into the cached HTML) — this fetch exists purely to
    // get a real pagination cursor for "Load More": getProductsByCategoryPage()'s
    // cursor (lastDoc) is a raw Firestore QueryDocumentSnapshot, which can't
    // cross the server→client boundary as a prop. Its `products` result is
    // deliberately unused — the already-displayed initial page is left
    // untouched.
    getProductsByCategoryPage("bath", CATEGORY_PAGE_SIZE, null).then((page) => {
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    });
  }, []);

  // Same tradeoff as CategoryPageContent's identical filter: applies to
  // whatever pages have been loaded so far, not the whole category — see
  // its comment for why (client-side filtering over paginated data).
  const filtered = useMemo(() => {
    const result = activeSizeAge ? products.filter((p) => productMatchesSizeAgeFilter(p, activeSizeAge)) : products;
    return sort ? sortProducts(result, sort) : result;
  }, [products, activeSizeAge, sort]);

  const handleSizeAgeChange = (age: SizeAgeFilter | null) => {
    // Updates local state immediately (drives the re-render right away,
    // without waiting on the router) — the URL push below is purely for
    // shareable/bookmarkable links and back-button support, not what the
    // UI itself reacts to.
    setActiveSizeAge(age);
    const params = new URLSearchParams(window.location.search);
    if (age) params.set("sizeAge", age);
    else params.delete("sizeAge");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    getProductsByCategoryPage("bath", CATEGORY_PAGE_SIZE, cursor)
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
        {t.category.bathTitle}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm flex-wrap">
        <div className="flex items-center gap-sm sm:ms-auto">
          <SizeAgeFilterSelect active={activeSizeAge} onChange={handleSizeAgeChange} />
          <SortSelect value={sort} onChange={setSort} className="self-end sm:self-auto" />
        </div>
      </div>

      <div className="mt-lg">
        {filtered.length === 0 ? (
          <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
        ) : (
          <ProductGrid products={filtered} />
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
