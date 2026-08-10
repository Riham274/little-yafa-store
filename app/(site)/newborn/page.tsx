"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function NewbornPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="newborn" title={t.category.newbornTitle} showAgeFilter={false} showGenderFilter />
    </Suspense>
  );
}
