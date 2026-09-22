import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import BathPageClient from "./BathPageClient";

// SSR pilot, same pattern as app/(site)/shoes/page.tsx: opts OUT of static
// rendering/the Full Route Cache entirely, so getProductsByCategoryPage()
// below re-runs on every single request — no revalidate window, no stale
// data risk. Deliberately NOT ISR.
export const dynamic = "force-dynamic";

export default async function BathPage() {
  const { products } = await getProductsByCategoryPage("bath", CATEGORY_PAGE_SIZE, null);
  return <BathPageClient initialProducts={products} />;
}
