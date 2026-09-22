import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import NewbornWoolPageClient from "./NewbornWoolPageClient";

// SSR pilot, same pattern as app/(site)/shoes/page.tsx: opts OUT of static
// rendering/the Full Route Cache entirely, so getProductsByCategoryPage()
// below re-runs on every single request — no revalidate window, no stale
// data risk. Deliberately NOT ISR. Note: the fabricType="wool" narrowing
// (like showGenderFilter's newbornGender narrowing) happens client-side in
// CategoryPageContent over this same "newborn" category fetch — unrelated
// to how the initial page of "newborn"-tagged products gets here.
export const dynamic = "force-dynamic";

export default async function NewbornWoolPage() {
  const { products } = await getProductsByCategoryPage("newborn", CATEGORY_PAGE_SIZE, null);
  return <NewbornWoolPageClient initialProducts={products} />;
}
