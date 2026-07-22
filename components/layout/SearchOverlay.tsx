"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <button
        className="text-on-surface-variant hover:text-secondary transition-all active:scale-95"
        title={t.nav.search}
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined">search</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-gutter"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-surface rounded-[2rem] p-lg w-full max-w-xl cloud-shadow">
            <div className="flex items-center gap-sm border-b border-outline-variant pb-4 mb-4">
              <span className="material-symbols-outlined text-primary">search</span>
              <input
                type="text"
                placeholder={t.nav.searchPlaceholder}
                className="flex-1 bg-transparent text-on-surface font-body-lg outline-none placeholder:text-on-surface-variant"
                autoFocus
              />
              <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-sm">
              <Link
                href="/girls"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-primary-container/20 text-primary font-label-md text-label-md hover:bg-primary-container/40 transition-colors"
              >
                {t.nav.girls}
              </Link>
              <Link
                href="/boys"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-primary-container/20 text-primary font-label-md text-label-md hover:bg-primary-container/40 transition-colors"
              >
                {t.nav.boys}
              </Link>
              <Link
                href="/hospital-bag"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-primary-container/20 text-primary font-label-md text-label-md hover:bg-primary-container/40 transition-colors"
              >
                {t.nav.hospitalBag}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
