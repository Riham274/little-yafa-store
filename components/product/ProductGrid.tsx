import type { Product } from "@/lib/types";
import { getTotalStock } from "@/lib/firebase/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  const sorted = [...products].sort((a, b) => {
    const aOut = getTotalStock(a) <= 0 ? 1 : 0;
    const bOut = getTotalStock(b) <= 0 ? 1 : 0;
    return aOut - bOut;
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
      {sorted.map((product, index) => (
        // First 4 cards — one full row at the md:grid-cols-4 breakpoint, two
        // full rows at the 2-column mobile layout — are reliably above the
        // fold, so their image is eager-loaded rather than lazy: on a
        // category page this is almost always the LCP element, and without
        // this the browser's preload scanner has no early hint to fetch it,
        // leaving it to lazy-load's intersection check instead.
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
