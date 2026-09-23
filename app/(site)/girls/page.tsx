import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import GirlsPageClient from "./GirlsPageClient";

// ISR (fuller pattern, two filters combined — see GirlsPageClient.tsx):
// statically generated and cached, regenerating in the background at most
// once every 60 seconds instead of re-running getProductsByCategoryPage()
// on every request.
export const revalidate = 60;

export default async function GirlsPage() {
  const { products } = await getProductsByCategoryPage("girls", CATEGORY_PAGE_SIZE, null);
  return <GirlsPageClient initialProducts={products} />;
}
