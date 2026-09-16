"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function NewbornWoolPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent
        category="newborn"
        title={t.category.newbornWoolTitle}
        showAgeFilter={false}
        showSizeAgeFilter
        showGenderFilter
        fabricType="wool"
      />
    </Suspense>
  );
}
