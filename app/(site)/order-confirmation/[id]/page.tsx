"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ImageWithSpinner from "@/components/ui/ImageWithSpinner";
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

          {order && order.items.length > 0 && (
            <div className="flex flex-col gap-2 mt-md">
              {order.items.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 text-start">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container-lowest shrink-0">
                    {item.image && <ImageWithSpinner src={item.image} alt={item.name[locale]} fill className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{item.name[locale]}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {t.product.size}: {item.size} · × {item.qty}
                    </p>
                  </div>
                </div>
              ))}
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
