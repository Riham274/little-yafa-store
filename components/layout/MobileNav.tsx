"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { count } = useCart();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    `flex flex-col items-center justify-center rounded-full px-4 py-1 transition-transform active:scale-90 ${
      isActive(href) ? "text-primary bg-primary-container/10" : "text-on-surface-variant hover:text-secondary"
    }`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface border-t gold-border shadow-[0px_-4px_20px_rgba(74,74,74,0.05)] rounded-t-xl">
      <Link href="/" className={linkClass("/")}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          storefront
        </span>
        <span className="font-label-sm text-label-sm">{t.mobileNav.shop}</span>
      </Link>
      <Link href="/girls" className={linkClass("/girls")}>
        <span className="material-symbols-outlined">female</span>
        <span className="font-label-sm text-label-sm">{t.nav.girls}</span>
      </Link>
      <Link href="/boys" className={linkClass("/boys")}>
        <span className="material-symbols-outlined">male</span>
        <span className="font-label-sm text-label-sm">{t.nav.boys}</span>
      </Link>
      <Link href="/cart" className={`${linkClass("/cart")} relative`}>
        <span className="material-symbols-outlined">shopping_cart</span>
        {count > 0 && (
          <span className="absolute -top-1 right-2 bg-secondary text-on-secondary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {count}
          </span>
        )}
        <span className="font-label-sm text-label-sm">{t.mobileNav.cart}</span>
      </Link>
    </div>
  );
}
