"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import { isProductOnSale } from "@/lib/sale";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import SortSelect from "@/components/product/SortSelect";
import PageLoader from "@/components/ui/PageLoader";

export default function SalePage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [sort, setSort] = useState<SortOption | null>(null);

  useEffect(() => {
    getAllProducts().then((all) => setProducts(all.filter(isProductOnSale)));
  }, []);

  const sorted = useMemo(
    () => (products ? sortProducts(products, sort ?? "newest") : []),
    [products, sort]
  );

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.saleTitle}
      </h1>

      {products !== null && products.length > 0 && (
        <div className="flex justify-end mb-lg">
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
