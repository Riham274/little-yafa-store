"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Boxes } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import CategoryCard from "@/components/product/CategoryCard";

// Below the fold and does its own Firestore fetch + loading spinner — no
// reason its code has to be in the same chunk the browser needs for
// everything above it. `ssr: false` is fine here since this whole file is
// already client-only.
const FeaturedProductsSection = dynamic(() => import("@/components/home/FeaturedProductsSection"), {
  ssr: false,
});

// Everything on the homepage below the hero logo/banner — split out of
// page.tsx so that hero section can be a Server Component (see page.tsx for
// why: it's the LCP element, and this content all needs useLanguage(),
// which is client-only).
export default function HomePageBelowFold() {
  const { t } = useLanguage();

  const categories = [
    { href: "/new-in", label: t.nav.newIn, icon: "/icon-new-in.png" },
    { href: "/newborn", label: t.home.categoryBaby, icon: "/icon-baby.png" },
    { href: "/girls", label: t.home.categoryGirl, icon: "/icon-girl.png" },
    { href: "/boys", label: t.home.categoryBoy, icon: "/icon-boy.png" },
  ];
  const categoriesRow2 = [
    { href: "/sale", label: t.home.categoryDiscounts, icon: "/icon-sale-olive.png", labelColor: "#AC7557" },
    { href: "/shoes", label: t.home.categoryShoes, icon: "/icon-shoes.png" },
    { href: "/dresses", label: t.home.categoryDresses, icon: "/icon-dresses.png" },
    { href: "/winter", label: t.home.categoryWinter, icon: "/icon-winter.png" },
  ];
  const services = [
    { href: "/bath", label: t.home.bathEssentials, icon: "/icon2-bath-essentials.png" },
    { href: "/blankets", label: t.home.babyBlankets, icon: "/icon2-baby-blankets.png" },
    { href: "/accessories", label: t.home.babyAccessories, icon: "/icon2-baby-accessories.png" },
    { href: "/gift-wrapping", label: t.home.giftWrapping, icon: "/icon2-gift-wrapping.png" },
    // No PNG icon — wholesale uses a lucide line-art icon instead (see render below).
    { href: "/wholesale", label: t.home.wholesale, icon: null },
  ];

  return (
    <>
      {/* Categories */}
      <section className="bg-[#5A5F44] px-gutter py-lg md:py-xl fade-in-up">
        <div className="max-w-[640px] mx-auto flex flex-col gap-3 sm:gap-4 md:gap-6">
          <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {categories.map((cat) => (
              <CategoryCard key={cat.href + cat.label} {...cat} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {categoriesRow2.map((cat) => (
              <CategoryCard key={cat.href + cat.label} {...cat} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-[#EFE5DC] px-gutter py-lg md:py-xl fade-in-up">
        <div className="max-w-[640px] mx-auto grid grid-cols-4 gap-1.5 sm:gap-4 md:gap-6">
          {[
            { icon: "spa", title: t.home.organic, desc: t.home.organicDesc },
            { icon: "workspace_premium", title: t.home.premiumPieces, desc: t.home.premiumPiecesDesc },
            { icon: "local_shipping", title: t.home.shipping, desc: t.home.shippingDesc },
            { icon: "swap_horiz", title: t.home.exchange, desc: t.home.exchangeDesc },
          ].map((badge) => (
            <div key={badge.icon} className="flex flex-col items-center text-center gap-0.5 sm:gap-1">
              <span
                className="material-symbols-outlined text-[40px] sm:text-[48px] md:text-[56px]"
                style={{ color: "#5A5F44", fontVariationSettings: "'FILL' 1" }}
              >
                {badge.icon}
              </span>
              <h3 className="font-body-md text-[9px] sm:text-[12px] md:text-[14px] font-semibold text-on-surface leading-tight px-0.5">{badge.title}</h3>
              <p className="font-body-md text-[7px] sm:text-[9px] md:text-[11px] text-on-surface-variant leading-snug px-0.5">{badge.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stripe Divider */}
      <section
        className="w-full h-[192px] sm:h-[240px] md:h-[288px]"
        style={{
          backgroundImage: "url('/stripe-divider.jpg')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Services */}
      <section className="relative bg-[#EFE5DC] px-gutter py-lg md:py-xl fade-in-up">
        <div className="max-w-[760px] mx-auto flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 md:gap-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory sm:overflow-visible">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group shrink-0 w-[100px] sm:w-auto snap-start flex flex-col items-center"
            >
              <div className="w-full aspect-[1/1.3] rounded-t-full bg-[#5A5F44] cloud-shadow flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1 pb-0.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                {service.icon ? (
                  <Image src={service.icon} alt={service.label} width={96} height={96} className="w-[84%] h-auto object-contain" />
                ) : (
                  <Boxes className="w-[84%] h-auto" style={{ aspectRatio: "1 / 1" }} color="#EFE5DC" strokeWidth={1.5} />
                )}
                <span
                  className="font-headline-sm text-[11px] sm:text-[13px] md:text-[15px] leading-tight text-center px-1"
                  style={{ color: "#EFE5DC", fontWeight: 500 }}
                >
                  {service.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {/* Hint that the row scrolls further when it overflows the viewport */}
        <div className="sm:hidden pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-l rtl:bg-gradient-to-r from-[#EFE5DC] to-transparent" />
      </section>

      {/* Discover Products */}
      <FeaturedProductsSection />
    </>
  );
}
