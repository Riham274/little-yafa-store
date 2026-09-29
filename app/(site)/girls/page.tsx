import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import GirlsPageClient from "./GirlsPageClient";

// ISR (fuller pattern, two filters combined — see GirlsPageClient.tsx):
// statically generated and cached, regenerating in the background at most
// once every 3 minutes instead of re-running getProductsByCategoryPage()
// on every request.
// 3 minutes, not 60s: every regeneration is a billed Vercel ISR write, and
// 60s across these pages used up the free plan's ISR write quota.
export const revalidate = 180;

export default async function GirlsPage() {
  const { products } = await getProductsByCategoryPage("girls", CATEGORY_PAGE_SIZE, null);
  return <GirlsPageClient initialProducts={products} />;
}
