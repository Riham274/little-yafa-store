"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";
import type { Product } from "@/lib/types";

// Split out of page.tsx so page.tsx itself can be an async Server Component
// (it fetches the first page of products server-side — see page.tsx) while
// the title, still translated via the client-side language system exactly
// as before, stays here. Same SSR-pilot pattern as app/(site)/shoes.
export default function BlanketsPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent
        category="blankets"
        title={t.category.blanketsTitle}
        showAgeFilter={false}
        showSizeAgeFilter
        initialProducts={initialProducts}
      />
    </Suspense>
  );
}
