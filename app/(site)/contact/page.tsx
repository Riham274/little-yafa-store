"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function ContactPage() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.contact.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
        <div className="md:col-span-5">
          <div className="bg-surface-container-low rounded-[2rem] p-lg cloud-shadow">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.contact.storeDetails}</h2>
            <div className="flex flex-col gap-4 font-body-md text-on-surface-variant">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <span>Manger Street, near the Church of the Nativity, Bethlehem, Palestine</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">call</span>
                <span>+970 2 274 1234</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">mail</span>
                <span>hello@littleyafa.ps</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <span>{t.contact.storeHours}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-surface-container-lowest rounded-[2rem] p-lg cloud-shadow flex flex-col gap-md"
          >
            {sent && (
              <div className="bg-primary-container/20 text-primary rounded-xl px-4 py-3 font-label-md text-label-md">
                {t.contact.sent}
              </div>
            )}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.fullName}</label>
              <input
                type="text"
                required
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.email}</label>
              <input
                type="email"
                required
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.subject}</label>
              <select className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
                <option>{t.contact.generalInquiry}</option>
                <option>{t.contact.orderSupport}</option>
                <option>{t.contact.shippingReturns}</option>
                <option>{t.contact.wholesale}</option>
              </select>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.message}</label>
              <textarea
                required
                rows={6}
                placeholder={t.contact.messagePlaceholder}
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
            >
              {t.contact.send}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
