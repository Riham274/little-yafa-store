"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function TowelsPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="towels" title={t.category.towelsTitle} showAgeFilter={false} />
    </Suspense>
  );
}
