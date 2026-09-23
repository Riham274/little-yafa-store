import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import NewbornCottonPageClient from "./NewbornCottonPageClient";

// ISR (fuller pattern, two URL filters + a fixed fabricType narrowing
// combined — see NewbornCottonPageClient.tsx): statically generated and
// cached, regenerating in the background at most once every 60 seconds
// instead of re-running getProductsByCategoryPage() on every request.
export const revalidate = 60;

export default async function NewbornCottonPage() {
  const { products } = await getProductsByCategoryPage("newborn", CATEGORY_PAGE_SIZE, null);
  return <NewbornCottonPageClient initialProducts={products} />;
}
