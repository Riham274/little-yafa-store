import { getAllProducts } from "@/lib/firebase/products";
import { isProductOnSale } from "@/lib/sale";
import SalePageClient from "./SalePageClient";

// ISR, same pattern as app/(site)/shoes/page.tsx's cautious pilot: this page
// was already safe to convert as-is — SalePageClient never calls
// useSearchParams()/useRouter() at all (sizeAge/sort are both plain
// useState, see its own comment), so there was no Suspense-fallback-gets-
// cached trap here to begin with. Statically generated and cached,
// regenerating in the background at most once every 3 minutes instead of
// re-running getAllProducts() on every request. Still passes
// { skipCache: true } — getAllProducts() has its own short-lived in-memory
// cache for client-side callers (the search bar), and this guarantees each
// regeneration cycle gets a genuinely fresh Firestore read rather than
// possibly reusing a slightly-stale entry left over from some other
// concurrent caller within the same server process.
// 3 minutes, not 60s: every regeneration is a billed Vercel ISR write, and
// 60s across these pages used up the free plan's ISR write quota.
export const revalidate = 180;

export default async function SalePage() {
  const all = await getAllProducts({ skipCache: true });
  return <SalePageClient initialProducts={all.filter(isProductOnSale)} />;
}
