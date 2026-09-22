import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import ShoesPageClient from "./ShoesPageClient";

// SSR pilot (see conversation plan): this route intentionally opts OUT of
// static rendering/the Full Route Cache entirely, so getProductsByCategoryPage()
// below re-runs on every single request — no revalidate window, no stale
// data risk. This is deliberately NOT ISR; that's a separate, later
// decision. Without this, Next.js would otherwise be free to prerender this
// page once at build time, since nothing else here uses a dynamic API.
export const dynamic = "force-dynamic";

export default async function ShoesPage() {
  const { products } = await getProductsByCategoryPage("shoes", CATEGORY_PAGE_SIZE, null);
  return <ShoesPageClient initialProducts={products} />;
}
