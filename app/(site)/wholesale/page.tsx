import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import WholesalePageClient from "./WholesalePageClient";

// ISR (fuller pattern — see app/(site)/bath/BathPageClient.tsx): statically
// generated and cached, regenerating in the background at most once every
// 3 minutes instead of re-running getProductsByCategoryPage() on every
// request.
// 3 minutes, not 60s: every regeneration is a billed Vercel ISR write, and
// 60s across these pages used up the free plan's ISR write quota.
export const revalidate = 180;

export default async function WholesalePage() {
  const { products } = await getProductsByCategoryPage("wholesale", CATEGORY_PAGE_SIZE, null);
  return <WholesalePageClient initialProducts={products} />;
}
