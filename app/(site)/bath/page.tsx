"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function BathPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="bath" title={t.category.bathTitle} showAgeFilter={false} />
    </Suspense>
  );
}
