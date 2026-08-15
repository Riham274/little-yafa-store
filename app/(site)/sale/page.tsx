"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import { isProductOnSale } from "@/lib/sale";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import PageLoader from "@/components/ui/PageLoader";

export default function SalePage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    getAllProducts().then((all) => setProducts(all.filter(isProductOnSale)));
  }, []);

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-lg">
        {t.category.saleTitle}
      </h1>

      {products === null ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
