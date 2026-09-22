"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import { productMatchesSizeAgeFilter, type SizeAgeFilter } from "@/lib/sizeAge";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import SizeAgeFilterSelect from "@/components/product/SizeAgeFilterSelect";
import SortSelect from "@/components/product/SortSelect";

// Split out of page.tsx so page.tsx itself can be an async Server Component
// (it fetches every on-sale product server-side — see page.tsx) while the
// title/sort/filter UI, unchanged from before, stays here. This page never
// had a "Load More" — it fetches the whole on-sale set in one shot both
// before and after this change — so there's no cursor-harvesting step here,
// unlike CategoryPageContent's paginated categories.
export default function SalePageClient({ initialProducts }: { initialProducts: Product[] }) {
  const { t } = useLanguage();
  const [sort, setSort] = useState<SortOption | null>(null);
  // This page has no other URL params to share a query string with (unlike
  // CategoryPageContent's pages), so this stays plain local state rather
  // than round-tripping through the URL.
  const [sizeAge, setSizeAge] = useState<SizeAgeFilter | null>(null);

  const filtered = useMemo(
    () => (sizeAge ? initialProducts.filter((p) => productMatchesSizeAgeFilter(p, sizeAge)) : initialProducts),
    [sizeAge, initialProducts]
  );

  const sorted = useMemo(() => sortProducts(filtered, sort ?? "newest"), [filtered, sort]);

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.saleTitle}
      </h1>

      {initialProducts.length > 0 && (
        <div className="flex items-center justify-end gap-sm mb-lg">
          <SizeAgeFilterSelect active={sizeAge} onChange={setSizeAge} />
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
      ) : (
        <ProductGrid products={sorted} />
      )}
    </div>
  );
}
