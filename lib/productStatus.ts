import type { Product } from "./types";

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isProductNew(product: Pick<Product, "createdAt">): boolean {
  return Date.now() - product.createdAt < NEW_WINDOW_MS;
}
