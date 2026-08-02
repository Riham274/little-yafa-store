"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getAllProducts } from "@/lib/firebase/products";
import type { Product } from "@/lib/types";
import ProductGrid from "@/components/product/ProductGrid";

const BOYS_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCw-8wAN2T20nFJ1grl-j4owyAT2g-xuS1ibbHmK-G2SCJEAGWrvhi729EYPCqIJhGvgUXEOE09jBXMqfLGxwjvGz5mWorEOCXnaEcmvfdSCq8eUm-pRCchi-6gaZopvqjL_W4DumsrSmblUUGuGsHEmrTZdYUWdpBod25GzYVU8SjoV0RyzzZO8VZH0IuA9Vab0eTcEcdK1a7lPGro5tiEAfpO-Ton4o8j1bq-F-_C88QcL_S4FbX7H4YBUhwfvs_VHgED5xUh0Oc";

const GIRLS_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDdpPqdbZgEeDghePe5nQnfNJB6-GOJbUmEakcDJNI9ZlZR_C0nLvFeDSAwrJxKsPQWid4UsUXNFK_diob0Y-W8IzHCsEejDuc2GvSh2Jkt6BPPKiWv00L1_-D4F3i6xpAQiPiM5L1eU0ypYnHdVPzRwyUOIHv3yW7tXRW7TLK9RmrWvNJxrru-5znwF4YByehQ7-BhnmX_2dsG_U6ipFtNOZEHg5T1udAfPlb5kCA4l3ffK3MPeicF3RPWW37XQxOHmxqROcNYBuI";

const HOSPITAL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBoAnbWwqFAUUMJnBIiUVT3cP4Npgrvd0tDD9sOQ1Sf-LMEtjt0ksGr0NpjmnKPB5yTaNITj4QrKllX5Fsmhf7HSySNBfre5O8UYHiSMQm8GXHXVSPGWnVSyvCatoTrWpy35RS9WJX_wLoSkJyI5kwUUnmgHN-pCUzUfQMlnwOD_brXAZ55jwJqlm9aNEz4R_UsQjvTwb8Q8F94IcQ02KA4L1mLifcO5xASGw-tSa_aWbf4jKlD5-uRQ9fanYgQoWmAdcfN0bwHYqY";

const QUOTE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDpKk6LTJaRXDsU8wX9FOWZgQw--NqF3dmYs3RbBuhV0zLICMR3prXrTdcjerSIhW0x_25n6rZlU607UcWt83Z3uIhzvbO6pfi0QJiCNUsQ7Ym7TqiBG9Z4GyPdmP-ajS0udKJNXf_pWHz8lCpN8VTIJZxbanZe7Q_3ep8UhoRzA_BuhYITNRnuFUYaXuCn2esaolNnDRvpizVXyZxekCIdh4swi3VHjPVpTyC7wHA2OV49zPTeBu5PyRBNEqep_PtQ3HlOkC02pyE";

export default function HomePage() {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then((products) => setFeatured(products.slice(0, 4)))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Category Grid */}
      <section className="max-w-container-max mx-auto px-gutter mb-xl">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="font-headline-md text-headline-md text-on-surface">{t.home.exploreCollections}</h2>
          <div className="h-[1px] flex-grow mx-md gold-border border-t" />
        </div>
        <div className="grid grid-cols-3 gap-md">
          {[
            { href: "/boys", label: t.nav.boys, image: BOYS_IMAGE },
            { href: "/girls", label: t.nav.girls, image: GIRLS_IMAGE },
            { href: "/hospital-bag", label: t.nav.hospitalBag, image: HOSPITAL_IMAGE },
          ].map((cat) => (
            <Link key={cat.href} href={cat.href} className="group block text-center">
              <div className="aspect-square rounded-[2rem] overflow-hidden mb-sm cloud-shadow transition-transform duration-500 group-hover:scale-[1.02] relative">
                <Image src={cat.image} alt={cat.label} fill className="object-cover" />
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {!loading && featured.length > 0 && (
        <section className="bg-surface-container-low py-xl">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-lg gap-md">
              <div>
                <span className="text-secondary font-label-sm text-label-sm uppercase tracking-widest block mb-2">
                  {t.home.editorsChoice}
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t.home.handpickedFavorites}</h2>
              </div>
            </div>
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="max-w-container-max mx-auto px-gutter py-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[
            { icon: "spa", title: t.home.organic, desc: t.home.organicDesc },
            { icon: "workspace_premium", title: t.home.premiumPieces, desc: t.home.premiumPiecesDesc },
            { icon: "local_shipping", title: t.home.shipping, desc: t.home.shippingDesc },
            { icon: "swap_horiz", title: t.home.exchange, desc: t.home.exchangeDesc },
          ].map((badge) => (
            <div key={badge.icon} className="flex flex-col items-center text-center p-md rounded-[2rem] bg-surface-container-low">
              <span className="material-symbols-outlined text-primary text-[40px] mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                {badge.icon}
              </span>
              <h3 className="font-headline-sm text-[16px] font-semibold text-on-surface mb-xs">{badge.title}</h3>
              <p className="font-body-md text-[14px] text-on-surface-variant">{badge.desc}</p>
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
