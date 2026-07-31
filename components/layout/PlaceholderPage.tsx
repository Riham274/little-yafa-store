"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function PlaceholderPage({ title }: { title: string }) {
  const { t } = useLanguage();
  return (
    <div className="max-w-container-max mx-auto px-gutter py-xl min-h-[40vh] flex flex-col items-center justify-center text-center">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-sm">{title}</h1>
      <p className="font-body-md text-on-surface-variant mb-lg">{t.placeholder.comingSoon}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
      >
        {t.placeholder.backHome}
      </Link>
    </div>
  );
}
