"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsBySection } from "@/lib/firebase/products";
import type { AgeGroup, Product, Section } from "@/lib/types";
import AgeFilterPills from "./AgeFilterPills";
import ProductGrid from "./ProductGrid";

export default function CategoryPageContent({
  section,
  title,
  showAgeFilter,
}: {
  section: Section;
  title: string;
  showAgeFilter: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const activeAge = (searchParams.get("age") as AgeGroup | null) ?? null;

  useEffect(() => {
    setLoading(true);
    getProductsBySection(section)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [section]);

  const filtered = useMemo(() => {
    if (!showAgeFilter || !activeAge) return products;
    return products.filter((p) => p.ageGroup === activeAge);
  }, [products, activeAge, showAgeFilter]);

  const handleAgeChange = (age: AgeGroup | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (age) params.set("age", age);
    else params.delete("age");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">{title}</h1>

      {showAgeFilter && <AgeFilterPills active={activeAge} onChange={handleAgeChange} />}

      <div className="mt-lg">
        {loading ? (
          <div className="py-xl text-center text-on-surface-variant font-body-md">…</div>
        ) : filtered.length === 0 ? (
          <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
        ) : (
          <ProductGrid products={filtered} />
        )}
      </div>
    </div>
  );
}
