"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import { useListingCache } from "@/lib/listingCache";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import { searchProducts } from "@/lib/searchProducts";
import { inStockFirst, sortProducts, type SortOption } from "@/lib/sortProducts";
import type { Product } from "@/lib/types";
import PageLoader from "@/components/ui/PageLoader";
import ProductGrid from "@/components/product/ProductGrid";
import SortSelect from "@/components/product/SortSelect";

type SavedSearch = { allProducts: Product[]; sort: SortOption | null };

function SearchResults() {
  useScrollRestoration();
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  // Coming BACK from a product: show the same results immediately (they'd
  // otherwise load after a spinner, too late for scroll restoration to
  // return to the product) — see lib/listingCache.ts.
  const { restored, save: saveToCache } = useListingCache<SavedSearch>("search", query);
  const [allProducts, setAllProducts] = useState<Product[] | null>(restored?.allProducts ?? null);
  const [sort, setSort] = useState<SortOption | null>(restored?.sort ?? null);

  useEffect(() => {
    if (restored) return;
    getAllProducts().then(setAllProducts);
  }, [restored]);

  useEffect(() => {
    if (allProducts) saveToCache({ allProducts, sort });
  }, [saveToCache, allProducts, sort]);

  const results = useMemo(
    () => (allProducts ? inStockFirst(sortProducts(searchProducts(allProducts, query, locale), sort ?? "newest")) : []),
    [allProducts, query, locale, sort]
  );

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.search.title}
        {query && <span className="text-on-surface-variant">{` "${query}"`}</span>}
      </h1>

      {allProducts !== null && results.length > 0 && (
        <div className="flex justify-end mb-lg">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}

      {allProducts === null ? (
        <PageLoader />
      ) : results.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant font-body-md">{t.search.noResults}</div>
      ) : (
        <ProductGrid products={results} />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}