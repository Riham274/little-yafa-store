"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function GirlsPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent section="girls" title={t.category.girlsTitle} showAgeFilter />
    </Suspense>
  );
}
