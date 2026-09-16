"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { SortOption } from "@/lib/sortProducts";

const SORT_OPTIONS: SortOption[] = ["newest", "priceAsc", "priceDesc"];

export default function SortSelect({
  value,
  onChange,
  className = "",
}: {
  // null = the user hasn't picked a sort yet, so the closed control shows a
  // neutral "Sort by" placeholder instead of pre-announcing "Newest" as if
  // it were chosen. Callers must leave the list in its natural fetch/append
  // order while this is null, not silently sort by "newest" underneath —
  // doing so used to re-sort the whole accumulated list by createdAt on
  // every "Load More" append, reshuffling products already on screen.
  value: SortOption | null;
  onChange: (value: SortOption) => void;
  className?: string;
}) {
  const { t } = useLanguage();

  const labels: Record<SortOption, string> = {
    newest: t.category.sortNewest,
    priceAsc: t.category.sortPriceLowHigh,
    priceDesc: t.category.sortPriceHighLow,
  };

  return (
    // Native <select> arrows don't reliably mirror to the correct edge
    // under dir="rtl" across browsers (same fix as CartItemRow's color/size
    // selects) — appearance-none strips the native arrow (which was
    // rendering stacked above the text instead of inline beside it) and
    // this custom one is positioned at the logical `start` side (right
    // edge in RTL, left edge in LTR) so it mirrors automatically and stays
    // vertically centered next to the text.
    <div className={`relative shrink-0 ${className}`}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as SortOption)}
        aria-label={t.category.filterSort}
        className="appearance-none w-full bg-surface rounded-xl border border-outline-variant ps-8 pe-3 py-2 font-body-md text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
      >
        <option value="" disabled hidden>
          {t.category.sortByLabel}
        </option>
        {SORT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
      <span className="absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
      </span>
    </div>
  );
}
