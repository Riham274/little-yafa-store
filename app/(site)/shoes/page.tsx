import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import ShoesPageClient from "./ShoesPageClient";

// ISR: statically generated and cached, regenerating in the background at
// most once every 3 minutes — most visitors get an instant cached response
// instead of triggering a fresh Firestore read on every single request
// (the earlier force-dynamic behavior), while stock/price changes still
// show up within 3 minutes.
// 3 minutes, not 60s: every regeneration is a billed Vercel ISR write, and
// 60s across these pages used up the free plan's ISR write quota.
export const revalidate = 180;

export default async function ShoesPage() {
  const { products } = await getProductsByCategoryPage("shoes", CATEGORY_PAGE_SIZE, null);
  return <ShoesPageClient initialProducts={products} />;
}
