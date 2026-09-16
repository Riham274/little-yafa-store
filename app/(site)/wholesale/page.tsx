"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function WholesalePage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="wholesale" title={t.category.wholesaleTitle} showAgeFilter={false} showSizeAgeFilter />
    </Suspense>
  );
}
