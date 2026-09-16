"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function DressesPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="dresses" title={t.category.dressesTitle} showAgeFilter={false} showSizeAgeFilter />
    </Suspense>
  );
}
