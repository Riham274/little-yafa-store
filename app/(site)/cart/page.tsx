"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { getProductById } from "@/lib/firebase/products";
import type { Product } from "@/lib/types";
import CartItemRow from "@/components/cart/CartItemRow";

// undefined = not fetched yet, null = deleted/hidden since it was added
type ProductLookup = Record<string, Product | null | undefined>;

export default function CartPage() {
  const { t } = useLanguage();
  const { items, subtotal } = useCart();
  const [productsById, setProductsById] = useState<ProductLookup>({});
  // Guards against re-fetching a product every time `items` changes (qty
  // bumps, variant swaps) — only fetch each distinct product once per visit.
  const requestedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ids = [...new Set(items.map((item) => item.productId))];
    ids.forEach((id) => {
      if (requestedIds.current.has(id)) return;
      requestedIds.current.add(id);
      getProductById(id).then((product) => {
        setProductsById((prev) => ({ ...prev, [id]: product }));
      });
    });
  }, [items]);

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface mb-lg">{t.cart.title}</h1>

      {items.length === 0 ? (
        <div className="text-center py-xl">
          <p className="font-body-lg text-on-surface-variant mb-md">{t.cart.empty}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:shadow-lg transition-all active:scale-95"
          >
            {t.cart.continueShopping}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
          <div className="md:col-span-8 flex flex-col gap-md">
            {items.map((item) => (
              <CartItemRow
                key={`${item.productId}-${item.color}-${item.size}`}
                item={item}
                product={productsById[item.productId]}
              />
            ))}
          </div>
          <aside className="md:col-span-4">
            <div className="bg-surface-container-low rounded-[2rem] p-lg cloud-shadow sticky top-36">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.checkout.orderSummary}</h2>
              <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface border-t gold-border pt-4 mb-lg">
                <span>{t.cart.subtotal}</span>
                <span className="text-secondary">{formatPrice(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                className="w-full flex items-center justify-center px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
              >
                {t.cart.confirmOrder}
              </Link>
              <div className="flex items-center gap-2 justify-center mt-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <p className="font-label-sm text-label-sm">{t.cart.secureCheckout}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
