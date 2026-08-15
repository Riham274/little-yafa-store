"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getProductsByCategory } from "@/lib/firebase/products";
import { sortProducts, type SortOption } from "@/lib/sortProducts";
import type { AgeGroup, Category, Product } from "@/lib/types";
import PageLoader from "@/components/ui/PageLoader";
import AgeFilterPills from "./AgeFilterPills";
import GenderFilterPills, { type GenderFilterValue } from "./GenderFilterPills";
import ProductGrid from "./ProductGrid";
import SortSelect from "./SortSelect";

export default function CategoryPageContent({
  category,
  title,
  showAgeFilter,
  showGenderFilter = false,
}: {
  category: Category;
  title: string;
  showAgeFilter: boolean;
  showGenderFilter?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption | null>(null);

  const activeAge = (searchParams.get("age") as AgeGroup | null) ?? null;
  const activeGender = (searchParams.get("gender") as GenderFilterValue | null) ?? null;

  useEffect(() => {
    setLoading(true);
    getProductsByCategory(category)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = useMemo(() => {
    let result = products;
    if (showAgeFilter && activeAge) {
      result = result.filter((p) => p.ageGroups.includes(activeAge));
    }
    // Boys/Girls tabs on the Newborn page filter on the independent
    // newbornGender sub-field, not the main categories array — unrelated to
    // whether the product is also tagged the main "boys"/"girls" category.
    if (showGenderFilter && activeGender) {
      result = result.filter((p) => p.newbornGender === activeGender || p.newbornGender === "unisex");
    }
    return sortProducts(result, sort ?? "newest");
  }, [products, activeAge, showAgeFilter, activeGender, showGenderFilter, sort]);

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

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm">
        {(showAgeFilter || showGenderFilter) && (
          <div className="min-w-0 sm:flex-1">
            {showAgeFilter && <AgeFilterPills active={activeAge} onChange={handleAgeChange} />}
            {showGenderFilter && <GenderFilterPills active={activeGender} onChange={handleGenderChange} />}
          </div>
        )}
        <SortSelect value={sort} onChange={setSort} className="self-end sm:self-auto sm:ms-auto" />
      </div>

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
