import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import BoysPageClient from "./BoysPageClient";

// ISR (fuller pattern, two filters combined — see BoysPageClient.tsx):
// statically generated and cached, regenerating in the background at most
// once every 60 seconds instead of re-running getProductsByCategoryPage()
// on every request.
export const revalidate = 60;

export default async function BoysPage() {
  const { products } = await getProductsByCategoryPage("boys", CATEGORY_PAGE_SIZE, null);
  return <BoysPageClient initialProducts={products} />;
}
