"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function WinterPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="winter" title={t.category.winterTitle} showAgeFilter={false} showSizeAgeFilter />
    </Suspense>
  );
}
