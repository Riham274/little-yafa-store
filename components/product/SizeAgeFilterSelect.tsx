"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SIZE_AGE_FILTERS, type SizeAgeFilter } from "@/lib/sizeAge";

/** Display label for each size-age option, from a locale's storefront
 * dictionary — also used by the admin Products page's size-age filter, so
 * both show identical option names. */
export function sizeAgeLabels(category: Dictionary["category"]): Record<SizeAgeFilter, string> {
  return {
    "0-3m": category.sizeAge0to3m,
    "3-6m": category.sizeAge3to6m,
    "6-9m": category.sizeAge6to9m,
    "9-12m": category.sizeAge9to12m,
    "12-18m": category.sizeAge12to18m,
    "18-24m": category.sizeAge18to24m,
    "1-2y": category.sizeAge1to2y,
    "2-3y": category.sizeAge2to3y,
    "3-4y": category.sizeAge3to4y,
    "4-5y": category.sizeAge4to5y,
    "5-6y": category.sizeAge5to6y,
  };
}

// A separate, additional filter next to AgeFilterPills' original 3 tabs
// (which read the admin-tagged Product.ageGroups field) — this one is
// entirely automatic, derived from parsing each product's free-text size
// labels (see lib/sizeAge.ts). Styled as a dropdown, matching SortSelect,
// since it sits directly next to it in the filter row.
export default function SizeAgeFilterSelect({
  active,
  onChange,
  className = "",
}: {
  active: SizeAgeFilter | null;
  onChange: (age: SizeAgeFilter | null) => void;
  className?: string;
}) {
  const { t } = useLanguage();

  const labels = sizeAgeLabels(t.category);

  return (
    // Same appearance-none + custom icon fix as SortSelect/CartItemRow —
    // the native <select> arrow doesn't reliably mirror under dir="rtl"
    // and was rendering stacked above the text instead of inline beside
    // it. Positioned at the logical `start` side (right edge in RTL, left
    // edge in LTR) so it mirrors automatically.
    <div className={`relative shrink-0 ${className}`}>
      <select
        value={active ?? ""}
        onChange={(e) => onChange((e.target.value || null) as SizeAgeFilter | null)}
        aria-label={t.category.sizeAgeFilterLabel}
        className="appearance-none w-full bg-surface rounded-xl border border-outline-variant ps-8 pe-3 py-2 font-body-md text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
      >
        <option value="">{t.category.sizeAgeAll}</option>
        {SIZE_AGE_FILTERS.map((age) => (
          <option key={age} value={age}>
            {labels[age]}
          </option>
        ))}
      </select>
      <span className="absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
      </span>
    </div>
  );
}
