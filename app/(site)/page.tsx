"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const QUOTE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDpKk6LTJaRXDsU8wX9FOWZgQw--NqF3dmYs3RbBuhV0zLICMR3prXrTdcjerSIhW0x_25n6rZlU607UcWt83Z3uIhzvbO6pfi0QJiCNUsQ7Ym7TqiBG9Z4GyPdmP-ajS0udKJNXf_pWHz8lCpN8VTIJZxbanZe7Q_3ep8UhoRzA_BuhYITNRnuFUYaXuCn2esaolNnDRvpizVXyZxekCIdh4swi3VHjPVpTyC7wHA2OV49zPTeBu5PyRBNEqep_PtQ3HlOkC02pyE";

export default function HomePage() {
  const { t } = useLanguage();
  const categories = [
    { href: "/", label: t.nav.newIn, icon: "/icon-new-in.png" },
    { href: "/hospital-bag", label: t.home.categoryBaby, icon: "/icon-baby.png" },
    { href: "/girls", label: t.home.categoryGirl, icon: "/icon-girl.png" },
    { href: "/boys", label: t.home.categoryBoy, icon: "/icon-boy.png" },
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
      <section className="bg-[url('/olive-pattern.jpeg')] bg-cover bg-center px-gutter py-[46px] md:py-[69px] fade-in-up">
        <div className="max-w-container-max mx-auto flex justify-start">
          <div className="w-[54%] sm:w-[39%] md:w-[34%] lg:w-[28%] min-h-[135px] sm:min-h-[160px] md:min-h-[200px] lg:min-h-[229px] rounded-t-full bg-[#EFE5DC] border border-[#8C916F]/60 cloud-shadow px-6 sm:px-7 md:px-[34px] flex items-center justify-center text-center">
            <p
              className="font-headline-sm text-[12px] sm:text-[14px] md:text-[16px] lg:text-[17px] leading-snug"
              style={{ color: "#8C916F", fontWeight: 300 }}
            >
              {t.home.beautifulClothes}
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[#8C916F] px-gutter py-lg md:py-xl fade-in-up">
        <div className="max-w-[640px] mx-auto grid grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {categories.map((cat) => (
            <Link key={cat.href + cat.label} href={cat.href} className="group flex flex-col items-center">
              <div className="w-full aspect-[1/1.3] rounded-t-full bg-[#EFE5DC] cloud-shadow flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1 pb-0.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                <Image src={cat.icon} alt={cat.label} width={96} height={96} className="w-[84%] h-auto object-contain" />
                <span
                  className="font-headline-sm text-[11px] sm:text-[13px] md:text-[15px] leading-tight text-center px-1"
                  style={{ color: "#8C916F", fontWeight: 500 }}
                >
                  {cat.label}
                </span>
              </div>
            </Link>
          ))}
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

      {/* Quote */}
      <section className="max-w-container-max mx-auto px-gutter pb-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="md:col-span-2 bg-primary-container/10 p-lg rounded-[2.5rem] flex flex-col justify-center items-center text-center">
            <span className="material-symbols-outlined text-primary text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
              spa
            </span>
            <h3 className="font-headline-md text-headline-md text-primary max-w-xl">&ldquo;{t.home.quote}&rdquo;</h3>
            <p className="mt-4 text-on-surface-variant font-label-md">{t.home.quoteSub}</p>
          </div>
          <div className="aspect-square md:aspect-auto rounded-[2.5rem] overflow-hidden cloud-shadow relative">
            <Image src={QUOTE_IMAGE} alt="" fill className="object-cover" />
          </div>
        </div>
      </section>
    </>
  );
}
