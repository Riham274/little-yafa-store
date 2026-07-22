"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { placeOrder, InsufficientStockError } from "@/lib/firebase/orders";

const SHIPPING = 15;
const FREE_SHIPPING_THRESHOLD = 200;
const LAST_ORDER_KEY = "little-yafa-last-order";

export default function CheckoutPage() {
  const { locale, t } = useLanguage();
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-gutter py-xl text-center">
        <p className="font-body-lg text-on-surface-variant mb-md">{t.cart.empty}</p>
        <Link href="/" className="text-primary underline">
          {t.cart.continueShopping}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const orderId = await placeOrder(items, {
        customerName: fullName,
        customerPhone: phone,
        customerAddress: address,
      });

      window.sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          id: orderId,
          items,
          total,
          createdAt: Date.now(),
        })
      );

      clear();
      router.push(`/order-confirmation/${orderId}`);
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        setError(
          t.checkout.errorStock
            .replace("{name}", err.productName)
            .replace("{stock}", String(err.available))
        );
      } else {
        setError(t.checkout.errorGeneric);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-gutter pb-xl">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.checkout.title}</h1>

      <div className="bg-surface-container-low rounded-[2rem] p-lg mb-lg">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.checkout.orderSummary}</h2>
        <div className="flex flex-col gap-4 mb-md">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-surface-container-lowest overflow-hidden shrink-0">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name[locale]} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-label-md text-label-md text-on-surface">{item.name[locale]}</p>
                <p className="font-body-md text-[14px] text-on-surface-variant">Qty: {item.qty}</p>
              </div>
              <p className="font-body-md text-on-surface">{formatPrice(item.price * item.qty)}</p>
            </div>
          ))}
        </div>
        <div className="border-t gold-border pt-4 flex flex-col gap-2">
          <div className="flex justify-between font-body-md text-on-surface-variant">
            <span>{t.checkout.subtotal}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between font-body-md text-on-surface-variant">
            <span>{t.checkout.shipping}</span>
            <span>{shipping === 0 ? "—" : formatPrice(shipping)}</span>
          </div>
          <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface">
            <span>{t.checkout.total}</span>
            <span className="text-secondary">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-[2rem] p-lg cloud-shadow">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.checkout.deliveryDetails}</h2>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-md">
          <div>
            <label htmlFor="fullName" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              {t.checkout.fullName}
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.checkout.fullNamePlaceholder}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              {t.checkout.phone}
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.checkout.phonePlaceholder}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="address" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              {t.checkout.address}
            </label>
            <textarea
              id="address"
              required
              rows={4}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.checkout.addressPlaceholder}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-lg flex items-center justify-center gap-2 px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-70"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {t.checkout.processing}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">lock</span>
              {t.checkout.placeOrder}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
