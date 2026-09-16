"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import { isProductOnSale } from "@/lib/sale";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import { productMatchesSizeAgeFilter, type SizeAgeFilter } from "@/lib/sizeAge";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import SizeAgeFilterSelect from "@/components/product/SizeAgeFilterSelect";
import SortSelect from "@/components/product/SortSelect";
import PageLoader from "@/components/ui/PageLoader";

export default function SalePage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [sort, setSort] = useState<SortOption | null>(null);
  // This page has no other URL params to share a query string with (unlike
  // CategoryPageContent's pages), so this stays plain local state rather
  // than round-tripping through the URL.
  const [sizeAge, setSizeAge] = useState<SizeAgeFilter | null>(null);

  useEffect(() => {
    getAllProducts().then((all) => setProducts(all.filter(isProductOnSale)));
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    return sizeAge ? products.filter((p) => productMatchesSizeAgeFilter(p, sizeAge)) : products;
  }, [products, sizeAge]);

  const sorted = useMemo(
    () => sortProducts(filtered, sort ?? "newest"),
    [filtered, sort]
  );

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.saleTitle}
      </h1>

      {products !== null && products.length > 0 && (
        <div className="flex items-center justify-end gap-sm mb-lg">
          <SizeAgeFilterSelect active={sizeAge} onChange={setSizeAge} />
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}

      {products === null ? (
        <PageLoader />
      ) : sorted.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
      ) : (
        <ProductGrid products={sorted} />
      )}
    </div>
  );
}
