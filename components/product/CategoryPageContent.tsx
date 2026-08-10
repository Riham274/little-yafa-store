"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsBySection } from "@/lib/firebase/products";
import type { AgeGroup, Product, Section } from "@/lib/types";
import PageLoader from "@/components/ui/PageLoader";
import AgeFilterPills from "./AgeFilterPills";
import GenderFilterPills, { type GenderFilterValue } from "./GenderFilterPills";
import ProductGrid from "./ProductGrid";

export default function CategoryPageContent({
  section,
  title,
  showAgeFilter,
  showGenderFilter = false,
}: {
  section: Section;
  title: string;
  showAgeFilter: boolean;
  showGenderFilter?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const activeAge = (searchParams.get("age") as AgeGroup | null) ?? null;
  const activeGender = (searchParams.get("gender") as GenderFilterValue | null) ?? null;

  useEffect(() => {
    setLoading(true);
    getProductsBySection(section)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [section]);

  const filtered = useMemo(() => {
    let result = products;
    if (showAgeFilter && activeAge) {
      result = result.filter((p) => p.ageGroups.includes(activeAge));
    }
    if (showGenderFilter && activeGender) {
      result = result.filter((p) => p.gender === activeGender || p.gender === "unisex");
    }
    return result;
  }, [products, activeAge, showAgeFilter, activeGender, showGenderFilter]);

  const handleAgeChange = (age: AgeGroup | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (age) params.set("age", age);
    else params.delete("age");
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

      {showAgeFilter && <AgeFilterPills active={activeAge} onChange={handleAgeChange} />}
      {showGenderFilter && <GenderFilterPills active={activeGender} onChange={handleGenderChange} />}

      <div className="mt-lg">
        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
        ) : (
          <ProductGrid products={filtered} />
        )}
      </div>
    </div>
  );
}
