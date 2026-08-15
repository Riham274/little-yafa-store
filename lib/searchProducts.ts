import type { Locale, Product } from "@/lib/types";

/** Matches against the product's name and description in the given locale
 * only — a query typed while browsing in Arabic matches Arabic text, not
 * whatever English name a product happens to also have. */
export function searchProducts(products: Product[], query: string, locale: Locale): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) => {
    const name = p.name[locale]?.toLowerCase() ?? "";
    const description = p.description[locale]?.toLowerCase() ?? "";
    return name.includes(q) || description.includes(q);
  });
}