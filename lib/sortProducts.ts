import { isProductOnSale } from "./sale";
import type { Product } from "./types";

export type SortOption = "newest" | "priceAsc" | "priceDesc";

function effectivePrice(product: Product): number {
  return isProductOnSale(product) && product.salePrice !== undefined ? product.salePrice : (product.price ?? 0);
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  if (sort === "newest") {
    return [...products].sort((a, b) => b.createdAt - a.createdAt);
  }
  // Priceless products (e.g. wholesale items) can't be meaningfully ordered
  // by price, so they're left at the end regardless of sort direction
  // rather than clustering at whichever end 0 would otherwise land on.
  const direction = sort === "priceAsc" ? 1 : -1;
  const priced = products.filter((p) => p.price !== undefined);
  const priceless = products.filter((p) => p.price === undefined);
  priced.sort((a, b) => (effectivePrice(a) - effectivePrice(b)) * direction);
  return [...priced, ...priceless];
}
