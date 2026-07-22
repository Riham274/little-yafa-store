"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function AnnouncementBar() {
  const { t } = useLanguage();
  return (
    <div className="w-full bg-primary text-on-primary py-2 px-gutter text-center font-label-md text-label-md">
      {t.announcement} &nbsp;·&nbsp;{" "}
      <Link href="/girls" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
        {t.shopNow}
      </Link>
    </div>
  );
}
