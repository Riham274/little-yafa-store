"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useScrollRestoration } from "@/lib/useScrollRestoration";
import { useCategoryProducts } from "@/lib/useCategoryProducts";
import type { Product } from "@/lib/types";
import LoadMoreButton from "@/components/product/LoadMoreButton";
import ProductGrid from "@/components/product/ProductGrid";
import SortSelect from "@/components/product/SortSelect";

// ISR/caching pilot: a Shoes-specific rewrite that deliberately does NOT
// use CategoryPageContent (still used, unchanged, by the other 12 category
// pages) and deliberately never calls useSearchParams()/useRouter().
//
// Why this was necessary: this page has none of the URL-param-driven
// filters the shared component supports for other categories — Shoes has
// always passed showAgeFilter={false} and left showSizeAgeFilter/
// showGenderFilter at their default-off values, so age/size/gender
// filtering was never actually reachable here. Sort has always been plain
// local state, never URL-driven, so it was never part of the problem
// either. But CategoryPageContent calls useSearchParams() unconditionally
// (needed by the OTHER pages' filters), and Next.js requires any component
// using that hook to sit inside a Suspense boundary — under static
// generation/ISR (export const revalidate below), Next.js can't know the
// request's search params at build time, so it bakes the Suspense
// *fallback* into the cached HTML instead of real content, deferring
// everything to client-side hydration. That's a real regression (no more
// content for JS-disabled visitors/crawlers, and a hydration-driven content
// swap that's itself a CLS risk) for a page that never needed the hook's
// value in the first place. Removing the dependency entirely — rather than
// working around Suspense — is what actually lets this page be both
// genuinely cached AND render real content in the initial HTML.
export default function ShoesPageClient({ initialProducts }: { initialProducts: Product[] }) {
  useScrollRestoration();
  const { t } = useLanguage();
  // Load More appends each new batch after what's already shown — see
  // lib/useCategoryProducts.ts.
  const { products, loadingMore, hasMore, loadMore, sort, setSort } = useCategoryProducts("shoes", initialProducts);

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-md">
        {t.category.shoesTitle}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-sm sm:flex-wrap">
        <div className="flex items-center gap-sm sm:ms-auto">
          <SortSelect value={sort} onChange={setSort} className="self-end sm:self-auto" />
        </div>
      </div>

      <div className="mt-lg">
        {products.length === 0 ? (
          <div className="py-xl text-center text-on-surface-variant font-body-md">{t.category.noProducts}</div>
        ) : (
          <ProductGrid products={products} />
        )}
        {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
      </div>
    </div>
  );
}
