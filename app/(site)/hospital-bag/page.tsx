"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function HospitalBagPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent section="hospital" title={t.category.hospitalTitle} showAgeFilter={false} />
    </Suspense>
  );
}
