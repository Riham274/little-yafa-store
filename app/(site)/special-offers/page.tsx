"use client";

import { useLanguage } from "@/context/LanguageContext";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function SpecialOffersPage() {
  const { t } = useLanguage();
  return <PlaceholderPage title={t.footer.specialOffers} />;
}
