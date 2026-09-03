"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function NewbornCottonPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent
        category="newborn"
        title={t.category.newbornCottonTitle}
        showAgeFilter={false}
        showGenderFilter
        fabricType="cotton"
      />
    </Suspense>
  );
}
