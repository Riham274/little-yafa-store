"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCategoryProducts } from "@/lib/useCategoryProducts";
import { productMatchesSizeAgeFilter, type SizeAgeFilter } from "@/lib/sizeAge";
import type { AgeGroup, Category, NewbornFabricType, Product } from "@/lib/types";
import PageLoader from "@/components/ui/PageLoader";
import AgeFilterPills from "./AgeFilterPills";
import GenderFilterPills, { type GenderFilterValue } from "./GenderFilterPills";
import LoadMoreButton from "./LoadMoreButton";
import ProductGrid from "./ProductGrid";
import SizeAgeFilterSelect from "./SizeAgeFilterSelect";
import SortSelect from "./SortSelect";

export default function CategoryPageContent({
  category,
  title,
  showAgeFilter,
  showSizeAgeFilter = false,
  showGenderFilter = false,
  fabricType,
  initialProducts,
}: {
  category: Category;
  title: string;
  // The ORIGINAL admin-tagged ageGroups tabs (0-3m/3-24m/2-10y) — only ever
  // meaningful for Boys/Girls, since the admin product form only exposes
  // that checkbox section for those two categories (see ProductFormModal's
  // showAgeGroups). Stays exactly as before; unrelated to showSizeAgeFilter.
  showAgeFilter: boolean;
  // The separate, automatic size-label-parsed age dropdown (lib/sizeAge.ts)
  // — independent of showAgeFilter above, since it works off actual size
  // text rather than the admin-tagged ageGroups field, so it's meaningful
  // on any category with sized products. Defaults to false so every
  // existing call site keeps its current behavior unless opted in.
  showSizeAgeFilter?: boolean;
  showGenderFilter?: boolean;
  // Newborn-only sub-classification (Cotton/Muslin vs Wool/Winter) — when
  // set, further narrows this category's products to that fabric type on
  // top of everything else. Independent of showGenderFilter's Boys/Girls
  // tabs, same as newbornGender and newbornFabricType are independent of
  // each other on the product itself.
  fabricType?: NewbornFabricType;
  // Set only by the Shoes page's Server Component, which fetches the first
  // page itself (see app/(site)/shoes/page.tsx) so it can be in the initial
  // HTML response instead of a client-side fetch popping it in after
  // hydration. Every other call site leaves this undefined and keeps
  // fetching its own first page exactly as before.
  initialProducts?: Product[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Fetches the first page itself when initialProducts isn't given (and
  // again if `category` changes); Load More appends each new batch after
  // what's already shown — see lib/useCategoryProducts.ts.
  const { products, loading, loadingMore, hasMore, loadMore, sort, setSort } = useCategoryProducts(
    category,
    initialProducts
  );

  const activeAge = (searchParams.get("age") as AgeGroup | null) ?? null;
  // Independent of activeAge above (the original admin-tagged ageGroups
  // tabs) — its own query param so the two filters never collide and can
  // both be active at once. See lib/sizeAge.ts.
  const activeSizeAge = (searchParams.get("sizeAge") as SizeAgeFilter | null) ?? null;
  const activeGender = (searchParams.get("gender") as GenderFilterValue | null) ?? null;

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
    // Applies on top of (ANDed with) the ageGroups filter above — both are
    // independent and can narrow the list together.
    if (showSizeAgeFilter && activeSizeAge) {
      result = result.filter((p) => productMatchesSizeAgeFilter(p, activeSizeAge));
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
    // No sorting here: the hook keeps `products` in display order (sorted
    // per Load More batch), so filtering just narrows it without moving
    // anything already on screen.
    return result;
  }, [products, activeAge, activeSizeAge, showAgeFilter, showSizeAgeFilter, activeGender, showGenderFilter, fabricType]);

  const handleAgeChange = (age: AgeGroup | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (age) params.set("age", age);
    else params.delete("age");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSizeAgeChange = (age: SizeAgeFilter | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (age) params.set("sizeAge", age);
    else params.delete("sizeAge");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleGenderChange = (gender: GenderFilterValue | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (gender) params.set("gender", gender);
    else params.delete("gender");
    router.push(`?${params.toString()}`, { scroll: false });
  };


  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">{title}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm sm:flex-wrap">
        {(showAgeFilter || showGenderFilter) && (
          <div className="min-w-0 sm:flex-1">
            {showAgeFilter && <AgeFilterPills active={activeAge} onChange={handleAgeChange} />}
            {showGenderFilter && <GenderFilterPills active={activeGender} onChange={handleGenderChange} />}
          </div>
        )}
        <div className="flex items-center gap-sm sm:ms-auto">
          {/* Separate, additional filter from the original age tabs above —
              parses size labels automatically, doesn't replace or read from
              anything the tabs use, and works on its own on categories that
              never set the tabs' ageGroups field at all. See lib/sizeAge.ts. */}
          {showSizeAgeFilter && <SizeAgeFilterSelect active={activeSizeAge} onChange={handleSizeAgeChange} />}
          <SortSelect value={sort} onChange={setSort} className="self-end sm:self-auto" />
        </div>
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
            {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
          </>
        )}
      </div>
    </div>
  );
}
