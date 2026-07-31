"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { AgeGroup } from "@/lib/types";

const AGE_GROUPS: AgeGroup[] = ["0-3m", "3-24m", "2-10y"];

export default function AgeFilterPills({
  active,
  onChange,
}: {
  active: AgeGroup | null;
  onChange: (age: AgeGroup | null) => void;
}) {
  const { t } = useLanguage();

  const ageLabels: Record<AgeGroup, string> = {
    "0-3m": t.category.age0to3m,
    "3-24m": t.category.age3to24m,
    "2-10y": t.category.age2to10y,
  };

  const pillClass = (isActive: boolean) =>
    `px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors border ${
      isActive
        ? "bg-primary-container/20 text-primary border-primary/30"
        : "bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/30"
    }`;

  return (
    <div className="flex gap-sm overflow-x-auto hide-scrollbar pb-1" id="filter-pills">
      <button className={pillClass(active === null)} onClick={() => onChange(null)}>
        {t.category.allAges}
      </button>
      {AGE_GROUPS.map((age) => (
        <button key={age} className={pillClass(active === age)} onClick={() => onChange(age)}>
          {ageLabels[age]}
        </button>
      ))}
    </div>
  );
}
