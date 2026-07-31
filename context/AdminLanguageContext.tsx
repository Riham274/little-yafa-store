"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminDictionaries, type AdminDictionary, type AdminLocale } from "@/lib/i18n/adminDictionaries";

const STORAGE_KEY = "little-yafa-admin-locale";

type AdminLanguageContextValue = {
  locale: AdminLocale;
  dir: "ltr" | "rtl";
  t: AdminDictionary;
  setLocale: (locale: AdminLocale) => void;
};

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);

/**
 * Deliberately does NOT touch document.documentElement — the root layout's
 * customer-facing LanguageProvider also wraps admin routes and manages
 * html.lang/dir from its own localStorage key. Mutating the same attributes
 * here would race it (whichever provider's mount effect commits last wins).
 * Instead, direction/language are applied locally via a `dir`/data-attribute
 * on the admin shell's own root element — see AdminShell and the login page.
 */
export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as AdminLocale | null;
    if (stored && adminDictionaries[stored]) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (next: AdminLocale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <AdminLanguageContext.Provider value={{ locale, dir, t: adminDictionaries[locale], setLocale }}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) throw new Error("useAdminLanguage must be used within AdminLanguageProvider");
  return ctx;
}
