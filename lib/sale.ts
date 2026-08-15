import type { Product } from "./types";

export function isProductOnSale(product: Pick<Product, "price" | "salePrice">): boolean {
  return product.price !== undefined && product.salePrice !== undefined && product.salePrice < product.price;
}

export function getDiscountPercent(price: number, salePrice: number): number {
  return Math.round((1 - salePrice / price) * 100);
}
