"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAdmin } from "@/lib/firebase/auth";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import AdminLanguageSwitcher from "./AdminLanguageSwitcher";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir, locale } = useAdminLanguage();

  const NAV_ITEMS = [
    { href: "/admin/dashboard", label: t.nav.overview, icon: "dashboard" },
    { href: "/admin/dashboard/products", label: t.nav.products, icon: "inventory_2" },
    { href: "/admin/dashboard/orders", label: t.nav.orders, icon: "receipt_long" },
    { href: "/admin/dashboard/messages", label: t.nav.messages, icon: "mail" },
    { href: "/admin/dashboard/finance", label: t.nav.finance, icon: "account_balance" },
  ];

  const isActive = (href: string) => (href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href));

  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
  };

  return (
    <div dir={dir} data-admin-locale={locale} className="min-h-screen bg-surface flex">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 w-full z-40 bg-surface-container-lowest border-b gold-border flex items-center justify-between px-gutter py-4">
        <button onClick={() => setOpen((o) => !o)} className="text-on-surface">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span
          className="font-headline-sm text-headline-sm text-primary"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {t.common.brand}
        </span>
        <div className="w-6" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 start-0 h-full w-64 bg-surface-container-lowest border-e gold-border z-50 flex flex-col p-md transition-transform duration-300 md:translate-x-0 ${
          open ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"
        }`}
      >
        <div
          className="font-headline-sm text-headline-sm text-primary mb-md px-2 pt-2"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {t.common.brand}
        </div>
        <AdminLanguageSwitcher className="mb-lg px-2" />
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md transition-colors ${
                isActive(item.href)
                  ? "bg-primary-container/20 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t gold-border pt-md">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">storefront</span>
            {t.common.viewStore}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md text-error hover:bg-error-container/20 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            {t.common.logout}
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <main className="flex-1 md:ms-64 pt-20 md:pt-0 px-gutter py-lg max-w-[1400px]">{children}</main>
    </div>
  );
}
