"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { createContactMessage } from "@/lib/firebase/contactMessages";

export default function ContactPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SUBJECT_OPTIONS: { value: string; label: string }[] = [
    { value: "General Inquiry", label: t.contact.generalInquiry },
    { value: "Order Support", label: t.contact.orderSupport },
    { value: "Shipping & Returns", label: t.contact.shippingReturns },
    { value: "Wholesale Opportunities", label: t.contact.wholesale },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await createContactMessage({ name, phone, subject, message });
      setSent(true);
      setName("");
      setPhone("");
      setSubject("General Inquiry");
      setMessage("");
    } catch (err) {
      console.error("[contact] submit failed:", err);
      setError(t.contact.errorGeneric);
    } finally {
      setSending(false);
    }
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
                <span>{t.footer.location}</span>
              </div>
              <a
                href="https://wa.me/972595143325"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined text-primary">call</span>
                <span dir="ltr">+972 59-514-3325</span>
              </a>
              <a
                href="https://www.instagram.com/little_yafa_store"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 hover:opacity-70 transition-opacity"
              >
                <svg className="w-6 h-6 fill-current text-primary shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.947.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>{t.contact.instagramHandle}</span>
              </a>
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
            {error && (
              <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 font-label-md text-label-md">
                {error}
              </div>
            )}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.fullName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.subject}</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              >
                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.contact.message}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder={t.contact.messagePlaceholder}
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center justify-center px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-70"
            >
              {sending ? t.contact.sending : t.contact.send}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
