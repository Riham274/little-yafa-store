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

// ISR/caching pilot (fuller pattern) — see app/(site)/bath/BathPageClient.tsx
// for the full rationale. Deliberately never calls useSearchParams(): reads
// the URL's `sizeAge` param via plain browser APIs (window.location.search)
// in a mount effect instead, which is invisible to Next's static-generation
// dynamic-API tracking, so the grid itself renders unconditionally.
export default function BlanketsPageClient({ initialProducts }: { initialProducts: Product[] }) {
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
    window.addEventListener("popstate", readFilterFromUrl);
    return () => window.removeEventListener("popstate", readFilterFromUrl);
  }, []);

  useEffect(() => {
    getProductsByCategoryPage("blankets", CATEGORY_PAGE_SIZE, null).then((page) => {
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    });
  }, []);

  const filtered = useMemo(() => {
    const result = activeSizeAge ? products.filter((p) => productMatchesSizeAgeFilter(p, activeSizeAge)) : products;
    return sort ? sortProducts(result, sort) : result;
  }, [products, activeSizeAge, sort]);

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
    getProductsByCategoryPage("blankets", CATEGORY_PAGE_SIZE, cursor)
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
        {t.category.blanketsTitle}
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
