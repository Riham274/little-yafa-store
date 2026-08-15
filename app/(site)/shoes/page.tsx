"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function ShoesPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="shoes" title={t.category.shoesTitle} showAgeFilter={false} />
    </Suspense>
  );
}
