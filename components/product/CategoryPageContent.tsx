"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import type { AgeGroup, Category, NewbornFabricType, Product } from "@/lib/types";
import PageLoader from "@/components/ui/PageLoader";
import AgeFilterPills from "./AgeFilterPills";
import GenderFilterPills, { type GenderFilterValue } from "./GenderFilterPills";
import ProductGrid from "./ProductGrid";
import SortSelect from "./SortSelect";

const PAGE_SIZE = 24;

export default function CategoryPageContent({
  category,
  title,
  showAgeFilter,
  showGenderFilter = false,
  fabricType,
}: {
  category: Category;
  title: string;
  showAgeFilter: boolean;
  showGenderFilter?: boolean;
  // Newborn-only sub-classification (Cotton/Muslin vs Wool/Winter) — when
  // set, further narrows this category's products to that fabric type on
  // top of everything else. Independent of showGenderFilter's Boys/Girls
  // tabs, same as newbornGender and newbornFabricType are independent of
  // each other on the product itself.
  fabricType?: NewbornFabricType;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortOption | null>(null);

  const activeAge = (searchParams.get("age") as AgeGroup | null) ?? null;
  const activeGender = (searchParams.get("gender") as GenderFilterValue | null) ?? null;

  useEffect(() => {
    setLoading(true);
    setProducts([]);
    setCursor(null);
    setHasMore(false);
    getProductsByCategoryPage(category, PAGE_SIZE, null)
      .then((page) => {
        setProducts(page.products);
        setCursor(page.lastDoc);
        setHasMore(page.hasMore);
      })
      .finally(() => setLoading(false));
  }, [category]);

  // Age/gender filtering and sorting apply to whatever pages have been
  // loaded so far, not the whole category — a filter can show fewer results
  // than actually exist until "Load More" pulls in the page that has them.
  // That's the standard tradeoff of client-side filtering over paginated
  // data; solving it properly would mean filtered server-side queries (and
  // their own composite indexes) per filter combination, which is well
  // beyond what this pagination change is for.
  const filtered = useMemo(() => {
    let result = products;
    if (showAgeFilter && activeAge) {
      result = result.filter((p) => p.ageGroups.includes(activeAge));
    }
    // Boys/Girls tabs on the Newborn page filter on the independent
    // newbornGender sub-field, not the main categories array — unrelated to
    // whether the product is also tagged the main "boys"/"girls" category.
    if (showGenderFilter && activeGender) {
      result = result.filter((p) => p.newbornGender === activeGender || p.newbornGender === "unisex");
    }
    // Products saved before this field existed (or never classified) have
    // newbornFabricType undefined — they simply don't match either fabric
    // sub-page rather than being guessed into one (see toProduct()'s
    // comment in lib/firebase/products.ts).
    if (fabricType) {
      result = result.filter((p) => p.newbornFabricType === fabricType);
    }
    // Only re-sort when the admin has actually picked a sort option —
    // otherwise (the default state) the list must stay in whatever order
    // it was fetched/appended in. Falling back to a "newest" sort here
    // unconditionally used to re-sort the *entire* accumulated list by
    // createdAt on every render, including right after "Load More"
    // appended a page — which could reshuffle products already on screen
    // (a newly-fetched item with a more recent createdAt would jump above
    // ones the customer had already scrolled past), reading as a scroll
    // jump even though the actual scroll offset never changed.
    return sort ? sortProducts(result, sort) : result;
  }, [products, activeAge, showAgeFilter, activeGender, showGenderFilter, fabricType, sort]);

  const handleAgeChange = (age: AgeGroup | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (age) params.set("age", age);
    else params.delete("age");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleGenderChange = (gender: GenderFilterValue | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (gender) params.set("gender", gender);
    else params.delete("gender");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    getProductsByCategoryPage(category, PAGE_SIZE, cursor)
      .then((page) => {
        setProducts((prev) => [...prev, ...page.products]);
        setCursor(page.lastDoc);
        setHasMore(page.hasMore);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">{title}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm">
        {(showAgeFilter || showGenderFilter) && (
          <div className="min-w-0 sm:flex-1">
            {showAgeFilter && <AgeFilterPills active={activeAge} onChange={handleAgeChange} />}
            {showGenderFilter && <GenderFilterPills active={activeGender} onChange={handleGenderChange} />}
          </div>
        )}
        <SortSelect value={sort} onChange={setSort} className="self-end sm:self-auto sm:ms-auto" />
      </div>

      <div className="mt-lg">
        {loading ? (
          <PageLoader />
        ) : (
          <>
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
                  className="flex items-center gap-2 px-lg py-3 rounded-full border border-outline-variant font-label-md text-label-md text-on-surface hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  {loadingMore && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  )}
                  {t.category.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
