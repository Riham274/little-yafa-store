"use client";

import Link from "next/link";
import Image from "next/image";
import { Boxes } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import FeaturedProductsSection from "@/components/home/FeaturedProductsSection";

// Icon source files aren't guaranteed to share the same intrinsic aspect
// ratio (e.g. icon-sale-olive.png is a tall 304x597 tag glyph vs. the square
// ~280x280 garment icons), which previously threw off the card's computed
// size when width/height props were used. Rendering into a fixed square box
// with `fill` + `object-contain` keeps every card the same size regardless
// of the source image's own dimensions.
function CategoryCard({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="group flex flex-col items-center">
      <div className="w-full aspect-[1/1.3] rounded-t-full bg-[#EFE5DC] cloud-shadow flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1 pb-0.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
        <div className="relative w-[84%] aspect-square">
          <Image src={icon} alt={label} fill sizes="120px" className="object-contain" />
        </div>
        <span
          className="font-headline-sm text-[11px] sm:text-[13px] md:text-[15px] leading-tight text-center px-1"
          style={{ color: "#8C916F", fontWeight: 500 }}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { t } = useLanguage();
  const categories = [
    { href: "/new-in", label: t.nav.newIn, icon: "/icon-new-in.png" },
    { href: "/newborn", label: t.home.categoryBaby, icon: "/icon-baby.png" },
    { href: "/girls", label: t.home.categoryGirl, icon: "/icon-girl.png" },
    { href: "/boys", label: t.home.categoryBoy, icon: "/icon-boy.png" },
  ];
  const categoriesRow2 = [
    { href: "/sale", label: t.home.categoryDiscounts, icon: "/icon-sale-olive.png" },
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
      {/* Logo showcase */}
      <section className="bg-[#8C916F] px-gutter pt-md pb-sm md:pt-[40px] md:pb-md flex justify-center fade-in-up">
        <Image
          src="/logo-hero.png"
          alt="Little Yafa — Baby & Kids Store"
          width={628}
          height={397}
          priority
          className="w-24 sm:w-28 md:w-36 lg:w-40 h-auto"
        />
      </section>

      {/* Pattern banner with arched caption */}
      <section className="bg-[url('/olive-pattern.jpeg')] bg-cover bg-center px-gutter py-[27px] md:py-[39px] fade-in-up">
        <div className="max-w-container-max mx-auto flex justify-start">
          <div className="w-[38%] sm:w-[24%] md:w-[22%] lg:w-[14%] aspect-[1/1.3] rounded-t-full bg-[#EFE5DC] cloud-shadow px-3 sm:px-4 md:px-5 flex items-center justify-center text-center">
            <p
              className="font-headline-sm text-[13px] sm:text-[15px] md:text-[17px] lg:text-[18px] leading-snug font-bold"
              style={{ color: "#8C916F" }}
            >
              {t.home.beautifulClothes}
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[#8C916F] px-gutter py-lg md:py-xl fade-in-up">
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
                style={{ color: "#8C916F", fontVariationSettings: "'FILL' 1" }}
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
              <div className="w-full aspect-[1/1.3] rounded-t-full bg-[#8C916F] cloud-shadow flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1 pb-0.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
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

      {/* Clothesline Banner */}
      <section className="w-full fade-in-up">
        <Image
          src="/clothesline-banner.jpeg"
          alt="Baby clothes hanging on a clothesline"
          width={1600}
          height={834}
          className="w-full h-auto block"
        />
      </section>

      {/* Discover Products */}
      <FeaturedProductsSection />
    </>
  );
}
