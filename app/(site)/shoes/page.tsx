import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import ShoesPageClient from "./ShoesPageClient";

// ISR: statically generated and cached, regenerating in the background at
// most once every 60 seconds — most visitors get an instant cached response
// instead of triggering a fresh Firestore read on every single request
// (the earlier force-dynamic behavior), while stock/price changes still
// show up within a minute.
export const revalidate = 60;

export default async function ShoesPage() {
  const { products } = await getProductsByCategoryPage("shoes", CATEGORY_PAGE_SIZE, null);
  return <ShoesPageClient initialProducts={products} />;
}
