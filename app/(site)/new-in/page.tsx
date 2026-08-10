"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function NewInPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="new-in" title={t.category.newInTitle} showAgeFilter={false} />
    </Suspense>
  );
}
