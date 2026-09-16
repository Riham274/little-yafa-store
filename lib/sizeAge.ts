import type { Product } from "@/lib/types";

// Automatic age filtering for the Boys/Girls category pages, derived purely
// from the free-text size labels admins already type in (colors[].sizes[].
// label) — deliberately NOT a manual admin-tagged field (that's what
// Product.ageGroups/AgeGroup is for, used elsewhere by the admin panel and
// left untouched by this file).
export type SizeAgeFilter =
  | "0-3m"
  | "3-6m"
  | "6-9m"
  | "9-12m"
  | "12-18m"
  | "18-24m"
  | "1-2y"
  | "2-3y"
  | "3-4y"
  | "4-5y"
  | "5-6y";

export const SIZE_AGE_FILTERS: SizeAgeFilter[] = [
  "0-3m",
  "3-6m",
  "6-9m",
  "9-12m",
  "12-18m",
  "18-24m",
  "1-2y",
  "2-3y",
  "3-4y",
  "4-5y",
  "5-6y",
];

export type MonthRange = { min: number; max: number };

// Each filter's own range, in months — "1-2y" (12-24m) deliberately overlaps
// "12-18m"/"18-24m" in month-space; these are distinct selectable buckets
// (a customer picking the one that matches how a size was actually labeled),
// not a strict partition of the 0-72 month span.
const FILTER_RANGES: Record<SizeAgeFilter, MonthRange> = {
  "0-3m": { min: 0, max: 3 },
  "3-6m": { min: 3, max: 6 },
  "6-9m": { min: 6, max: 9 },
  "9-12m": { min: 9, max: 12 },
  "12-18m": { min: 12, max: 18 },
  "18-24m": { min: 18, max: 24 },
  "1-2y": { min: 12, max: 24 },
  "2-3y": { min: 24, max: 36 },
  "3-4y": { min: 36, max: 48 },
  "4-5y": { min: 48, max: 60 },
  "5-6y": { min: 60, max: 72 },
};

// Matches anywhere in the label, not the whole string, so descriptive extra
// text in the same label (e.g. "0-3 شهر (طقم مشفى)") doesn't break parsing.
const YEAR_RANGE_RE = /(\d+)\s*-\s*(\d+)\s*(?:سنة|سنوات)/;
const MONTH_RANGE_RE = /(\d+)\s*-\s*(\d+)\s*(?:شهر|شهور)/;
// Only reached once the two unit-specific patterns above have failed to
// match, so by this point a bare "12-18"-style range has no attached unit
// word — the project's convention is to assume months for those.
const BARE_RANGE_RE = /(\d+)\s*-\s*(\d+)/;

/** Extracts an age range (in months) from a free-text size label, or null
 * if the label can't be interpreted as an age at all (a single number like
 * "56", a letter size like "M", or anything else with no number-range) —
 * callers must treat null as "don't exclude this size from any filter",
 * never as "exclude everywhere". */
export function parseSizeLabelAgeRange(label: string): MonthRange | null {
  const yearMatch = label.match(YEAR_RANGE_RE);
  if (yearMatch) return toRange(Number(yearMatch[1]) * 12, Number(yearMatch[2]) * 12);

  const monthMatch = label.match(MONTH_RANGE_RE);
  if (monthMatch) return toRange(Number(monthMatch[1]), Number(monthMatch[2]));

  const bareMatch = label.match(BARE_RANGE_RE);
  if (bareMatch) return toRange(Number(bareMatch[1]), Number(bareMatch[2]));

  return null;
}

function toRange(a: number, b: number): MonthRange {
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

// Strict (non-inclusive) overlap: two ranges that only touch at a single
// boundary point (e.g. "0-3" and "3-6", or "9-12" and "12-18") do NOT count
// as overlapping — each size range is treated as covering its span up to
// but not including the next bracket, matching how these labels are
// actually used (a "0-3" item isn't also a "3-6" item).
export function rangesOverlap(a: MonthRange, b: MonthRange): boolean {
  return a.min < b.max && b.min < a.max;
}

/** Every distinct, in-stock, parseable size-age range a product offers,
 * across all of its colors — the shared building block behind both the
 * Boys/Girls age filter (productMatchesSizeAgeFilter below) and the
 * "Similar Products" age-overlap score (see getSimilarProducts() in
 * lib/firebase/products.ts). Deduped so a product with several colors all
 * carrying the same size list doesn't inflate an overlap count. */
export function getProductAgeRanges(product: Product): MonthRange[] {
  const seen = new Set<string>();
  const ranges: MonthRange[] = [];
  for (const color of product.colors) {
    for (const size of color.sizes) {
      if (size.stock <= 0) continue;
      const range = parseSizeLabelAgeRange(size.label);
      if (!range) continue;
      const key = `${range.min}-${range.max}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ranges.push(range);
    }
  }
  return ranges;
}

/** How much two products' age ranges overlap, as a small integer: the
 * number of `a`'s distinct size-age ranges that find at least one
 * genuinely overlapping range on `b` — bounded by `a`'s own distinct range
 * count (typically 1-6), so it stays a secondary signal alongside a
 * category-match score, never a dominant one. */
export function ageRangeOverlapScore(a: Product, b: Product): number {
  const rangesA = getProductAgeRanges(a);
  const rangesB = getProductAgeRanges(b);
  return rangesA.filter((ra) => rangesB.some((rb) => rangesOverlap(ra, rb))).length;
}

/** Whether `product` should show under `filter`. `filter: null` ("All")
 * always matches, regardless of parseability — a shoe-size or letter-size
 * product is a perfectly normal product on the unfiltered page.
 *
 * Under a SPECIFIC filter, a product matches only if it has at least one
 * size, in at least one color, that's both in stock and whose parsed age
 * range genuinely overlaps the filter's range. A product whose sizes are
 * all unparseable (shoe sizes, letter sizes, ...) no longer gets a free
 * pass under a specific age filter — that "never hide" fallback now only
 * applies to "All"; it doesn't make sense to show a shoe-size product under
 * "9-12 شهر". A product with a MIX of parseable and unparseable sizes is
 * unaffected by this — it's included exactly when one of its parseable,
 * in-stock sizes overlaps, same as before.
 *
 * Sold-out sizes (stock <= 0) are skipped entirely — consistent with
 * getAvailableSizeLabels()/the product card, which already hides sold-out
 * sizes from its badge list. */
export function productMatchesSizeAgeFilter(product: Product, filter: SizeAgeFilter | null): boolean {
  if (!filter) return true;
  const filterRange = FILTER_RANGES[filter];
  return getProductAgeRanges(product).some((range) => rangesOverlap(range, filterRange));
}
