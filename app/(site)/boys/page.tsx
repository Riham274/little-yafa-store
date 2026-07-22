"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function BoysPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent section="boys" title={t.category.boysTitle} showAgeFilter />
    </Suspense>
  );
}
