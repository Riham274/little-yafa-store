"use client";

import { useLanguage } from "@/context/LanguageContext";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function EditOrderPage() {
  const { t } = useLanguage();
  return <PlaceholderPage title={t.footer.editOrder} />;
}
