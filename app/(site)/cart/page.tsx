"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import CartItemRow from "@/components/cart/CartItemRow";

const SHIPPING = 15;
const FREE_SHIPPING_THRESHOLD = 200;

export default function CartPage() {
  const { t } = useLanguage();
  const { items, subtotal } = useCart();

  const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING;
  const total = subtotal + shipping;

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
              <CartItemRow key={item.productId} item={item} />
            ))}
          </div>
          <aside className="md:col-span-4">
            <div className="bg-surface-container-low rounded-[2rem] p-lg cloud-shadow sticky top-36">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.checkout.orderSummary}</h2>
              <div className="flex justify-between font-body-md text-on-surface-variant mb-2">
                <span>{t.cart.subtotal}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between font-body-md text-on-surface-variant mb-4">
                <span>{t.cart.shipping}</span>
                <span>{shipping === 0 ? "—" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface border-t gold-border pt-4 mb-lg">
                <span>{t.cart.total}</span>
                <span className="text-secondary">{formatPrice(total)}</span>
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
