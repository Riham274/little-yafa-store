import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import BathPageClient from "./BathPageClient";

// ISR (fuller pattern pilot — see BathPageClient.tsx for why this needed a
// real component rewrite, not just removing an unused hook like Shoes/Sale
// did): statically generated and cached, regenerating in the background at
// most once every 60 seconds instead of re-running getProductsByCategoryPage()
// on every request.
export const revalidate = 60;

export default async function BathPage() {
  const { products } = await getProductsByCategoryPage("bath", CATEGORY_PAGE_SIZE, null);
  return <BathPageClient initialProducts={products} />;
}
