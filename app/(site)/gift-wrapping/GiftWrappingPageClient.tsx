"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCategoryProducts } from "@/lib/useCategoryProducts";
import { productMatchesSizeAgeFilter, type SizeAgeFilter } from "@/lib/sizeAge";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import type { Product } from "@/lib/types";
import LoadMoreButton from "@/components/product/LoadMoreButton";
import ProductGrid from "@/components/product/ProductGrid";
import SizeAgeFilterSelect from "@/components/product/SizeAgeFilterSelect";
import SortSelect from "@/components/product/SortSelect";

// ISR/caching pilot (fuller pattern) — see app/(site)/bath/BathPageClient.tsx
// for the full rationale. Deliberately never calls useSearchParams(): reads
// the URL's `sizeAge` param via plain browser APIs (window.location.search)
// in a mount effect instead, which is invisible to Next's static-generation
// dynamic-API tracking, so the grid itself renders unconditionally.
export default function GiftWrappingPageClient({ initialProducts }: { initialProducts: Product[] }) {
  useScrollRestoration();
  const { t } = useLanguage();
  const router = useRouter();
  // Load More appends each new batch after what's already shown — see
  // lib/useCategoryProducts.ts.
  const { products, loadingMore, hasMore, loadMore, sort, setSort } = useCategoryProducts("gift-wrapping", initialProducts);
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
    window.addEventListener("popstate", readFilterFromUrl);
    return () => window.removeEventListener("popstate", readFilterFromUrl);
  }, []);

  const filtered = useMemo(() => {
    const result = activeSizeAge ? products.filter((p) => productMatchesSizeAgeFilter(p, activeSizeAge)) : products;
    return result;
  }, [products, activeSizeAge]);

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
        {t.category.giftWrappingTitle}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm sm:flex-wrap">
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
