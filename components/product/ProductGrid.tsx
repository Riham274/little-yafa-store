import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

// Renders products in exactly the order given. It used to move out-of-stock
// products to the end itself, re-sorting the WHOLE list on every render —
// so after "Load More", newly loaded in-stock products jumped above
// out-of-stock ones already on screen. Callers now order their list (see
// inStockFirst/orderBatch in lib/sortProducts.ts), paginated ones one batch
// at a time.
export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
      {products.map((product, index) => (
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
