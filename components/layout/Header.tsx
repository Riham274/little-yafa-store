"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchOverlay from "./SearchOverlay";

export default function Header() {
  const { t } = useLanguage();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex flex-col pt-10" id="site-header">
      <nav
        className={`bg-surface/80 backdrop-blur-md border-b border-secondary-container/30 shadow-[0px_10px_30px_rgba(74,74,74,0.05)] transition-all duration-300 ease-in-out ${
          scrolled ? "py-2 shadow-lg" : "py-4"
        }`}
      >
        <div className="max-w-container-max mx-auto px-gutter flex items-center justify-between">
          <div className="flex items-center gap-md">
            <LanguageSwitcher />
            <SearchOverlay />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link
              href="/"
              className="block font-display-lg-mobile text-display-lg-mobile text-primary tracking-tight font-bold"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Little Yafa
            </Link>
          </div>
          <div className="flex items-center gap-md">
            <Link
              href="/cart"
              className="text-on-surface-variant hover:text-secondary transition-all active:scale-95 relative"
              title={t.nav.cart}
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-on-secondary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="hidden md:flex justify-center gap-lg mt-3 pt-3 border-t gold-border">
          <Link href="/boys" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
            {t.nav.boys}
          </Link>
          <Link href="/girls" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
            {t.nav.girls}
          </Link>
          <Link href="/hospital-bag" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest">
            {t.nav.hospitalBag}
          </Link>
        </div>
      </nav>
    </header>
  );
}
