"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { AgeGroup } from "@/lib/types";

const AGE_GROUPS: AgeGroup[] = ["0-12m", "1-3y", "4-6y", "7-12y"];

export default function AgeFilterPills({
  active,
  onChange,
}: {
  active: AgeGroup | null;
  onChange: (age: AgeGroup | null) => void;
}) {
  const { t } = useLanguage();

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
          {age}
        </button>
      ))}
    </div>
  );
}
