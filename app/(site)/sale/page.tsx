import { getAllProducts } from "@/lib/firebase/products";
import { isProductOnSale } from "@/lib/sale";
import SalePageClient from "./SalePageClient";

// SSR pilot, same pattern as app/(site)/shoes/page.tsx: opts OUT of static
// rendering/the Full Route Cache entirely, so getAllProducts() below re-runs
// on every single request — no revalidate window, no stale data risk.
// Deliberately NOT ISR. Also passes { skipCache: true } — getAllProducts()
// has its own short-lived in-memory cache for client-side callers (the
// search bar), but that cache lives in the SERVER's Node process here, not
// per-visitor, so leaving it on would let every customer within the same
// ~60s window silently share one stale read.
export const dynamic = "force-dynamic";

export default async function SalePage() {
  const all = await getAllProducts({ skipCache: true });
  return <SalePageClient initialProducts={all.filter(isProductOnSale)} />;
}
