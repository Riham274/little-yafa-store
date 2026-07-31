"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const linkClass = "font-body-md text-on-surface-variant hover:text-primary transition-colors";
const headingClass = "font-label-md text-label-md text-on-surface uppercase tracking-widest";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="w-full bg-surface-container-low border-t gold-border pt-xl pb-24 md:pb-xl px-gutter">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-xl">
          {/* Brand */}
          <div className="flex flex-col items-start gap-md">
            <Link href="/" className="block" aria-label="Little Yafa">
              <Image src="/logo-header.png" alt="Little Yafa" width={1201} height={677} className="h-12 w-auto" />
            </Link>
            <p className="font-body-md text-on-surface-variant leading-relaxed max-w-xs">
              {t.footer.brandDescription}
            </p>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full border gold-border flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all duration-300"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.947.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-md">
            <h3 className={headingClass}>{t.footer.categories}</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/boys" className={linkClass}>
                {t.nav.boys}
              </Link>
              <Link href="/girls" className={linkClass}>
                {t.nav.girls}
              </Link>
              <Link href="/hospital-bag" className={linkClass}>
                {t.nav.hospitalBag}
              </Link>
            </nav>
          </div>

          {/* Contact us */}
          <div className="flex flex-col gap-md">
            <h3 className={headingClass}>{t.footer.contactUs}</h3>
            <div className="flex flex-col gap-3">
              <a href="tel:+972595143325" className={`flex items-center gap-3 ${linkClass}`}>
                <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                <span dir="ltr">+972 59-514-3325</span>
              </a>
              <div className="flex items-center gap-3 font-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                <span>{t.footer.location}</span>
              </div>
            </div>
          </div>

          {/* Useful links */}
          <div className="flex flex-col gap-md">
            <h3 className={headingClass}>{t.footer.usefulLinks}</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/special-offers" className={linkClass}>
                {t.footer.specialOffers}
              </Link>
              <Link href="/edit-order" className={linkClass}>
                {t.footer.editOrder}
              </Link>
              <Link href="/policies" className={linkClass}>
                {t.footer.policiesTerms}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-xl pt-lg border-t gold-border text-center">
          <p className="font-body-md text-on-surface-variant opacity-60">
            © {new Date().getFullYear()} Little Yafa. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
