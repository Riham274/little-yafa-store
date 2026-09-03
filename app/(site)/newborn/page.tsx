"use client";

import { useLanguage } from "@/context/LanguageContext";
import CategoryCard from "@/components/product/CategoryCard";

// Intermediate sub-category picker — "مولود جديد" no longer goes straight to
// a product listing. It stops here first so the customer narrows down by
// fabric type (each option maps to its own newbornFabricType-filtered
// listing at /newborn/cotton and /newborn/wool), the same way picking a
// top-level category from the homepage works, just one level deeper.
export default function NewbornPage() {
  const { t } = useLanguage();

  return (
    // Full-bleed olive background, same color AND same padding pattern as
    // the homepage's main category section (bg-[#5A5F44] px-gutter py-lg
    // md:py-xl) — sized to its content like that section is, not to the
    // viewport, so it doesn't leave a large empty gap before the footer.
    <section className="bg-[#5A5F44] px-gutter py-lg md:py-xl">
      <div className="max-w-container-max mx-auto">
        <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile mb-lg text-center text-[#EFE5DC]">
          {t.category.newbornTitle}
        </h1>
        <div className="max-w-sm sm:max-w-md mx-auto grid grid-cols-2 gap-md sm:gap-lg">
          <CategoryCard
            href="/newborn/cotton"
            label={t.category.newbornCottonTitle}
            icon="/icon-cotton.png"
            sizes="200px"
            gapClassName="gap-2 sm:gap-3"
          />
          <CategoryCard
            href="/newborn/wool"
            label={t.category.newbornWoolTitle}
            icon="/icon-wool.png"
            sizes="200px"
            gapClassName="gap-2 sm:gap-3"
          />
        </div>
      </div>
    </section>
  );
}
