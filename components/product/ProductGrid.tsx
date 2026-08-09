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
      {sorted.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
