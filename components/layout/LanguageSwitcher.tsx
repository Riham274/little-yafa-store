"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { languageNames } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";

const LOCALES: Locale[] = ["en", "ar", "he"];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="text-on-surface-variant hover:text-secondary transition-all active:scale-95"
        title={t.nav.language}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">language</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-full mt-3 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 bg-surface-container-lowest rounded-2xl cloud-shadow border gold-border p-2 min-w-[160px] z-50"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={locale === l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`w-full text-left rtl:text-right flex items-center min-h-[44px] px-4 rounded-xl font-body-md transition-colors ${
                locale === l
                  ? "bg-primary-container/20 text-primary font-semibold"
                  : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {languageNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
