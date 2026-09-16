"use client";

import { useLanguage } from "@/context/LanguageContext";
import { SIZE_AGE_FILTERS, type SizeAgeFilter } from "@/lib/sizeAge";

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

  const labels: Record<SizeAgeFilter, string> = {
    "0-3m": t.category.sizeAge0to3m,
    "3-6m": t.category.sizeAge3to6m,
    "6-9m": t.category.sizeAge6to9m,
    "9-12m": t.category.sizeAge9to12m,
    "12-18m": t.category.sizeAge12to18m,
    "18-24m": t.category.sizeAge18to24m,
    "1-2y": t.category.sizeAge1to2y,
    "2-3y": t.category.sizeAge2to3y,
    "3-4y": t.category.sizeAge3to4y,
    "4-5y": t.category.sizeAge4to5y,
    "5-6y": t.category.sizeAge5to6y,
  };

  return (
    <select
      value={active ?? ""}
      onChange={(e) => onChange((e.target.value || null) as SizeAgeFilter | null)}
      aria-label={t.category.sizeAgeFilterLabel}
      className={`shrink-0 bg-surface rounded-xl border border-outline-variant px-3 py-2 font-body-md text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors ${className}`}
    >
      <option value="">{t.category.sizeAgeAll}</option>
      {SIZE_AGE_FILTERS.map((age) => (
        <option key={age} value={age}>
          {labels[age]}
        </option>
      ))}
    </select>
  );
}
