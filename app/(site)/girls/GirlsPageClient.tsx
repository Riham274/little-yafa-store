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
import type { AgeGroup, Product } from "@/lib/types";
import AgeFilterPills from "@/components/product/AgeFilterPills";
import ProductGrid from "@/components/product/ProductGrid";
import SizeAgeFilterSelect from "@/components/product/SizeAgeFilterSelect";
import SortSelect from "@/components/product/SortSelect";

// ISR/caching pilot (fuller pattern, two filters combined) — see
// app/(site)/bath/BathPageClient.tsx for the single-filter version and full
// rationale. Deliberately never calls useSearchParams(): reads BOTH the
// `age` (original admin-tagged ageGroups tabs) and `sizeAge` (automatic
// size-label-parsed dropdown) URL params via plain browser APIs
// (window.location.search) in a mount effect, which is invisible to Next's
// static-generation dynamic-API tracking — so the grid renders
// unconditionally, and both filters can be independently active at once,
// exactly matching CategoryPageContent's existing chained-.filter() logic.
export default function GirlsPageClient({ initialProducts }: { initialProducts: Product[] }) {
  useScrollRestoration();
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortOption | null>(null);
  // Both start null — matching what the cached HTML always shows, since the
  // real URL's query string can't be known at build/cache time — and are
  // corrected from the actual URL immediately on mount below.
  const [activeAge, setActiveAge] = useState<AgeGroup | null>(null);
  const [activeSizeAge, setActiveSizeAge] = useState<SizeAgeFilter | null>(null);

  useEffect(() => {
    const readFiltersFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveAge((params.get("age") as AgeGroup | null) ?? null);
      setActiveSizeAge((params.get("sizeAge") as SizeAgeFilter | null) ?? null);
    };
    readFiltersFromUrl();
    window.addEventListener("popstate", readFiltersFromUrl);
    return () => window.removeEventListener("popstate", readFiltersFromUrl);
  }, []);

  useEffect(() => {
    getProductsByCategoryPage("girls", CATEGORY_PAGE_SIZE, null).then((page) => {
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = products;
    if (activeAge) result = result.filter((p) => p.ageGroups.includes(activeAge));
    if (activeSizeAge) result = result.filter((p) => productMatchesSizeAgeFilter(p, activeSizeAge));
    return sort ? sortProducts(result, sort) : result;
  }, [products, activeAge, activeSizeAge, sort]);

  const handleAgeChange = (age: AgeGroup | null) => {
    setActiveAge(age);
    const params = new URLSearchParams(window.location.search);
    if (age) params.set("age", age);
    else params.delete("age");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSizeAgeChange = (age: SizeAgeFilter | null) => {
    setActiveSizeAge(age);
    const params = new URLSearchParams(window.location.search);
    if (age) params.set("sizeAge", age);
    else params.delete("sizeAge");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    getProductsByCategoryPage("girls", CATEGORY_PAGE_SIZE, cursor)
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
        {t.category.girlsTitle}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm flex-wrap">
        <div className="min-w-0 sm:flex-1">
          <AgeFilterPills active={activeAge} onChange={handleAgeChange} />
        </div>
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
