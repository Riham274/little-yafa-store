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

const isOutOfStock = (product: Product) =>
  product.colors.every((c) => c.sizes.every((s) => s.stock <= 0));

/** Moves out-of-stock products after in-stock ones, otherwise keeping the
 * given order (stable). Apply it to a whole list shown at once, or to each
 * "Load More" batch on its own (see orderBatch) — never to an
 * already-displayed list that's being appended to, or products already on
 * screen get pushed down below newly loaded ones. */
export function inStockFirst(products: Product[]): Product[] {
  return [...products.filter((p) => !isOutOfStock(p)), ...products.filter(isOutOfStock)];
}

/** Display order for one batch of products: the chosen sort (if any), then
 * out-of-stock last. Paginated lists order each batch this way and append
 * it after what's already shown, so loading more never reshuffles the
 * products already on screen. */
export function orderBatch(products: Product[], sort: SortOption | null): Product[] {
  return inStockFirst(sort ? sortProducts(products, sort) : products);
}
