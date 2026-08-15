"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import { pickRandom } from "@/lib/random";
import type { Category, Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import PageLoader from "@/components/ui/PageLoader";

const ALL_CATEGORIES: Category[] = [
  "boys",
  "girls",
  "newborn",
  "new-in",
  "gift-wrapping",
  "wholesale",
  "blankets",
  "accessories",
  "bath",
  "shoes",
  "dresses",
  "winter",
];
const PER_CATEGORY = 2;

// ~2 random products per category, deduped (a product can satisfy more than
// one category) and reshuffled so the final order isn't grouped by category.
function pickCuratedMix(products: Product[]): Product[] {
  const picked = new Map<string, Product>();
  for (const category of ALL_CATEGORIES) {
    const inCategory = products.filter((p) => p.categories.includes(category));
    for (const product of pickRandom(inCategory, PER_CATEGORY)) {
      picked.set(product.id, product);
    }
  }
  const combined = [...picked.values()];
  return pickRandom(combined, combined.length);
}

export default function ShopAllPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    getAllProducts().then((all) => setProducts(pickCuratedMix(all)));
  }, []);

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-lg">
        {t.category.shopAllTitle}
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
