"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import type { CartItem } from "@/lib/types";

const LAST_ORDER_KEY = "little-yafa-last-order";

type StoredOrder = {
  id: string;
  items: CartItem[];
  total: number;
  createdAt: number;
};

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const { locale, t } = useLanguage();
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
      if (raw) {
        const stored: StoredOrder = JSON.parse(raw);
        if (stored.id === params.id) setOrder(stored);
      }
    } catch {
      // ignore
    }
  }, [params.id]);

  const previewItems = order?.items.slice(0, 2) ?? [];
  const remaining = order ? Math.max(0, order.items.length - previewItems.length) : 0;

  return (
    <div className="flex-1 flex items-center justify-center px-gutter py-xl">
      <div className="max-w-md w-full text-center">
        <span
          className="material-symbols-outlined text-primary text-7xl inline-block animate-float"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface mt-md mb-2">{t.confirmation.title}</h1>
        <p className="font-body-lg text-on-surface-variant mb-lg">{t.confirmation.subtitle}</p>

        <div className="bg-surface-container-low rounded-[2rem] p-lg mb-lg">
          <div className="flex justify-between mb-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">{t.confirmation.orderReference}</span>
            <span className="font-label-md text-label-md text-primary">#{params.id.slice(0, 8).toUpperCase()}</span>
          </div>
          {order && (
            <div className="flex justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">{t.confirmation.orderDate}</span>
              <span className="font-label-md text-label-md text-on-surface">
                {new Date(order.createdAt).toLocaleDateString(locale)}
              </span>
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="flex gap-2 mt-md justify-center">
              {previewItems.map((item) =>
                item.image ? (
                  <div key={item.productId} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <Image src={item.image} alt={item.name[locale]} fill className="object-cover" />
                  </div>
                ) : null
              )}
              {remaining > 0 && (
                <div className="w-20 h-20 rounded-xl bg-primary-fixed flex items-center justify-center font-label-md text-label-md text-on-primary-fixed">
                  +{remaining}
                </div>
              )}
            </div>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 mb-md w-full"
        >
          {t.confirmation.continueShopping}
        </Link>
        <Link href="/contact" className="text-primary font-label-md text-label-md underline">
          {t.confirmation.contactConcierge}
        </Link>
      </div>
    </div>
  );
}
