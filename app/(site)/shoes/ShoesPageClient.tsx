"use client";

import { Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryPageContent from "@/components/product/CategoryPageContent";
import type { Product } from "@/lib/types";

// Split out of page.tsx so page.tsx itself can be an async Server Component
// (it fetches the first page of products server-side — see page.tsx)
// while the title, still translated via the client-side language system
// exactly as before, stays here. See the SSR pilot plan: only the product
// data-fetching mechanism changes on this page, not how language/locale is
// handled, to avoid introducing a new language-flash regression.
export default function ShoesPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const { t } = useLanguage();
  return (
    <Suspense>
      <CategoryPageContent
        category="shoes"
        title={t.category.shoesTitle}
        showAgeFilter={false}
        initialProducts={initialProducts}
      />
    </Suspense>
  );
}
