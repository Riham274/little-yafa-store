"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { useGoBack } from "@/lib/useGoBack";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchBar from "./SearchBar";

export default function Header() {
  const { t } = useLanguage();
  const { count } = useCart();
  const goBack = useGoBack();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex flex-col" id="site-header">
      <nav
        className={`bg-[#5A5F44] shadow-[0px_10px_30px_rgba(74,74,74,0.05)] transition-all duration-300 ease-in-out ${
          scrolled ? "py-2 shadow-lg" : "py-4"
        }`}
      >
        <div className="max-w-container-max mx-auto px-gutter grid grid-cols-[1fr_auto_1fr] items-center gap-sm md:gap-md">
          <div className="justify-self-start flex items-center gap-sm">
            {/* Same reach-without-scrolling convenience as the footer's
                "Back to Previous Page" button (components/layout/Footer.tsx)
                — reuses the same useGoBack() hook rather than calling
                router.back() again here, just surfaced in the header too. */}
            <button
              type="button"
              onClick={goBack}
              className="p-2 -m-2 rounded-full text-surface-bright hover:text-secondary-container transition-all active:scale-95"
              title={t.footer.backToPrevious}
              aria-label={t.footer.backToPrevious}
            >
              <span className="material-symbols-outlined rtl:rotate-180">arrow_back</span>
            </button>
            <LanguageSwitcher />
          </div>
          <SearchBar className="justify-self-center w-[62vw] max-w-[220px] sm:w-64 md:w-72 lg:w-80" />
          <Link
            href="/cart"
            className="justify-self-end p-2 -m-2 rounded-full text-surface-bright hover:text-secondary-container transition-all active:scale-95"
            title={t.nav.cart}
          >
            <span className="relative inline-flex">
              <span className="material-symbols-outlined">shopping_bag</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-on-secondary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
