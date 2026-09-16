"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function BlanketsPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="blankets" title={t.category.blanketsTitle} showAgeFilter={false} showSizeAgeFilter />
    </Suspense>
  );
}
