"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";

export default function GiftWrappingPage() {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent category="gift-wrapping" title={t.category.giftWrappingTitle} showAgeFilter={false} />
    </Suspense>
  );
}
