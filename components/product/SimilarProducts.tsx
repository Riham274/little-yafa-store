"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

const INITIAL_COUNT = 4;
const BATCH_SIZE = 4;

// `products` arrives already scored and sorted by getSimilarProducts() (see
// lib/firebase/products.ts) — usually more than INITIAL_COUNT so "Load
// More" can reveal further already-ranked items client-side without a
// second Firestore query, staying in the same score order throughout.
export default function SimilarProducts({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  if (products.length === 0) return null;

  const visible = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <section className="max-w-container-max mx-auto px-gutter py-xl">
      <h2 className="font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md text-on-surface mb-lg">{t.product.similar}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-lg">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => Math.min(c + BATCH_SIZE, products.length))}
            className="flex items-center gap-2 px-lg py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
          >
            {t.category.loadMore}
          </button>
        </div>
      )}
    </section>
  );
}
