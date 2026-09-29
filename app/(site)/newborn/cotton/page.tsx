import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import NewbornCottonPageClient from "./NewbornCottonPageClient";

// ISR (fuller pattern, two URL filters + a fixed fabricType narrowing
// combined — see NewbornCottonPageClient.tsx): statically generated and
// cached, regenerating in the background at most once every 3 minutes
// instead of re-running getProductsByCategoryPage() on every request.
// 3 minutes, not 60s: every regeneration is a billed Vercel ISR write, and
// 60s across these pages used up the free plan's ISR write quota.
export const revalidate = 180;

export default async function NewbornCottonPage() {
  const { products } = await getProductsByCategoryPage("newborn", CATEGORY_PAGE_SIZE, null);
  return <NewbornCottonPageClient initialProducts={products} />;
}
