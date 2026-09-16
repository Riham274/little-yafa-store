"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function AccessoriesPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="accessories" title={t.category.accessoriesTitle} showAgeFilter={false} showSizeAgeFilter />
    </Suspense>
  );
}
