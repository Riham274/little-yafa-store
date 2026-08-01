"use client";

import { useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function SearchBar({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={t.nav.search}
        onClick={() => inputRef.current?.focus()}
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-surface-bright hover:text-secondary-container transition-colors active:scale-95"
      >
        <span className="material-symbols-outlined text-[22px]">search</span>
      </button>
      <input
        ref={inputRef}
        type="text"
        aria-label={t.nav.search}
        placeholder={t.nav.searchPlaceholder}
        className="w-full min-w-0 h-10 rounded-full bg-[#EFE5DC] px-4 font-body-md text-[14px] text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-surface-bright/70 transition-all"
      />
    </div>
  );
}
