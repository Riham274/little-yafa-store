"use client";

import { useLanguage } from "@/context/LanguageContext";

export type GenderFilterValue = "boys" | "girls";
const GENDERS: GenderFilterValue[] = ["boys", "girls"];

export default function GenderFilterPills({
  active,
  onChange,
}: {
  active: GenderFilterValue | null;
  onChange: (gender: GenderFilterValue | null) => void;
}) {
  const { t } = useLanguage();

  const genderLabels: Record<GenderFilterValue, string> = {
    boys: t.category.genderBoys,
    girls: t.category.genderGirls,
  };

  const pillClass = (isActive: boolean) =>
    `px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors border ${
      isActive
        ? "bg-primary-container/20 text-primary border-primary/30"
        : "bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/30"
    }`;

  return (
    <div className="relative">
      <div className="flex gap-sm overflow-x-auto hide-scrollbar pb-1" id="filter-pills">
        <button className={pillClass(active === null)} onClick={() => onChange(null)}>
          {t.category.allGenders}
        </button>
        {GENDERS.map((gender) => (
          <button key={gender} className={pillClass(active === gender)} onClick={() => onChange(gender)}>
            {genderLabels[gender]}
          </button>
        ))}
      </div>
      {/* Hints that the pill row scrolls further when it overflows the viewport */}
      <div className="md:hidden pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l rtl:bg-gradient-to-r from-surface to-transparent" />
    </div>
  );
}
