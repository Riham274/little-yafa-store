"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { getFeaturedProductsPool } from "@/lib/firebase/products";
import { pickRandom } from "@/lib/random";
import { inStockFirst } from "@/lib/sortProducts";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";
import Spinner from "@/components/ui/Spinner";

const FEATURED_COUNT = 8;
// Sampled from a capped pool rather than the whole catalog — see
// getFeaturedProductsPool()'s comment in lib/firebase/products.ts. Large
// enough to still feel varied across visits, small enough to stay a cheap,
// flat-cost read regardless of how big the catalog grows.
const POOL_SIZE = 24;

export default function FeaturedProductsSection() {
  const { t } = useLanguage();
  // null = still loading; the featured pick is derived once products land,
  // not re-randomized on every re-render.
  const [loaded, setLoaded] = useState(false);
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    getFeaturedProductsPool(POOL_SIZE).then((pool) => {
      setFeatured(inStockFirst(pickRandom(pool, FEATURED_COUNT)));
      setLoaded(true);
    });
  }, []);

  return (
    <section className="px-gutter py-lg md:py-xl fade-in-up" style={{ backgroundColor: "#EFE5DC" }}>
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-lg">
          <h2 className="font-headline-md text-headline-md mb-2" style={{ color: "#5A5F44" }}>
            {t.home.discoverProducts}
          </h2>
          <p className="font-body-md" style={{ color: "#5A5F44" }}>
            {t.home.discoverSubtitle}
          </p>
        </div>

        {!loaded ? (
          <div className="flex justify-center py-xl">
            <Spinner size={40} />
          </div>
        ) : (
          <ProductGrid products={featured} />
        )}

        <div className="flex justify-center mt-lg">
          <Link
            href="/shop-all"
            className="inline-flex items-center gap-2 px-lg py-4 text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
            style={{ backgroundColor: "#5A5F44" }}
          >
            {t.home.viewAll}
            <span className="material-symbols-outlined rtl:rotate-180">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
