"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCategoryProducts } from "@/lib/useCategoryProducts";
import { productMatchesSizeAgeFilter, type SizeAgeFilter } from "@/lib/sizeAge";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import type { AgeGroup, Product } from "@/lib/types";
import AgeFilterPills from "@/components/product/AgeFilterPills";
import LoadMoreButton from "@/components/product/LoadMoreButton";
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
export default function BoysPageClient({ initialProducts }: { initialProducts: Product[] }) {
  useScrollRestoration();
  const { t } = useLanguage();
  const router = useRouter();
  // Load More appends each new batch after what's already shown — see
  // lib/useCategoryProducts.ts.
  const { products, loadingMore, hasMore, loadMore, sort, setSort } = useCategoryProducts("boys", initialProducts);
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
    // window.location.search isn't itself reactive — without this, a
    // browser back/forward navigation wouldn't be noticed at all.
    window.addEventListener("popstate", readFiltersFromUrl);
    return () => window.removeEventListener("popstate", readFiltersFromUrl);
  }, []);

  // Both filters apply together (ANDed), same as CategoryPageContent's
  // identical chained-.filter() logic — see its comment for why this only
  // ever narrows whatever pages have been loaded so far, not the whole
  // category.
  const filtered = useMemo(() => {
    let result = products;
    if (activeAge) result = result.filter((p) => p.ageGroups.includes(activeAge));
    if (activeSizeAge) result = result.filter((p) => productMatchesSizeAgeFilter(p, activeSizeAge));
    return result;
  }, [products, activeAge, activeSizeAge]);

  // Both handlers update local state immediately (drives the re-render
  // right away, without waiting on the router) and push a merged URL — each
  // only ever touches its own param, leaving the other filter's param (if
  // present) untouched in the query string.
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

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.boysTitle}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm sm:flex-wrap">
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
        {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
      </div>
    </div>
  );
}
