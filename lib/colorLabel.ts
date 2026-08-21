import type { LocalizedText, Locale } from "./types";

/** Resolves a cart/order item's color to display text in the given locale.
 * Falls back to Arabic (the canonical/required field), then to the raw
 * stored `color` string for carts saved before `colorLabel` existed. */
export function getColorLabel(item: { color: string; colorLabel?: LocalizedText }, locale: Locale): string {
  return item.colorLabel?.[locale] || item.colorLabel?.ar || item.color;
}
