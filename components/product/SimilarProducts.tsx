"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function SimilarProducts({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  if (products.length === 0) return null;

  return (
    <section className="max-w-container-max mx-auto px-gutter py-xl">
      <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.product.similar}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
