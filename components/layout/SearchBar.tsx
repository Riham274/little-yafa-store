"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import { searchProducts } from "@/lib/searchProducts";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 6;

export default function SearchBar({ className = "" }: { className?: string }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [allProducts, setAllProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Fetched once — the catalog is small enough that filtering it locally on
  // every keystroke is instant, no need to hit Firestore per character.
  useEffect(() => {
    getAllProducts().then(setAllProducts);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = allProducts ? searchProducts(allProducts, debouncedQuery, locale) : [];
  const hasQuery = query.trim().length > 0;
  const shown = results.slice(0, MAX_RESULTS);

  const closeDropdown = () => setOpen(false);

  const handleChange = (value: string) => {
    setQuery(value);
    setOpen(value.trim().length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    closeDropdown();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 min-w-0">
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
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => hasQuery && setOpen(true)}
          className="w-full min-w-0 h-10 rounded-full bg-[#EFE5DC] px-4 font-body-md text-[14px] text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-surface-bright/70 transition-all"
        />
      </form>

      {open && hasQuery && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-surface rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden max-w-[90vw]">
          {shown.length === 0 ? (
            <p className="px-4 py-4 font-body-md text-on-surface-variant text-center">{t.search.noResults}</p>
          ) : (
            <>
              <div className="flex flex-col divide-y divide-outline-variant/50 max-h-[70vh] overflow-y-auto">
                {shown.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    onClick={closeDropdown}
                    className="flex items-center gap-3 p-2.5 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-low shrink-0">
                      {product.colors[0]?.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.colors[0].images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px]">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-sm text-label-sm text-on-surface truncate">{product.name[locale]}</p>
                      {product.price !== undefined && (
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{formatPrice(product.price)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {results.length > MAX_RESULTS && (
                <Link
                  href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                  onClick={closeDropdown}
                  className="block text-center px-4 py-3 font-label-md text-label-md text-primary hover:text-secondary transition-colors border-t border-outline-variant/50"
                >
                  {t.search.seeAllResults}
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}