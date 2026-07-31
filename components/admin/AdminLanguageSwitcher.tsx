"use client";

import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { adminLanguageNames } from "@/lib/i18n/adminDictionaries";
import type { AdminLocale } from "@/lib/i18n/adminDictionaries";

const LOCALES: AdminLocale[] = ["en", "ar"];

export default function AdminLanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useAdminLanguage();

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Admin panel language">
      <span className="material-symbols-outlined text-on-surface-variant text-[18px] me-1">language</span>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm transition-colors ${
            locale === l
              ? "bg-primary-container/20 text-primary font-semibold"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          {adminLanguageNames[l]}
        </button>
      ))}
    </div>
  );
}
