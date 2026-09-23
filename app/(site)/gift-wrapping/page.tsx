import { getProductsByCategoryPage } from "@/lib/firebase/products";
import { CATEGORY_PAGE_SIZE } from "@/lib/categoryPageSize";
import GiftWrappingPageClient from "./GiftWrappingPageClient";

// ISR (fuller pattern — see app/(site)/bath/BathPageClient.tsx): statically
// generated and cached, regenerating in the background at most once every
// 60 seconds instead of re-running getProductsByCategoryPage() on every
// request.
export const revalidate = 60;

export default async function GiftWrappingPage() {
  const { products } = await getProductsByCategoryPage("gift-wrapping", CATEGORY_PAGE_SIZE, null);
  return <GiftWrappingPageClient initialProducts={products} />;
}
