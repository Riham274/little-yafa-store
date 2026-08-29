"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { getColorLabel } from "@/lib/colorLabel";
import { placeOrder, InsufficientStockError } from "@/lib/firebase/orders";
import { SHIPPING_RATES } from "@/lib/shipping";
import type { ShippingRegion } from "@/lib/types";
import PriceTag from "@/components/product/PriceTag";

const LAST_ORDER_KEY = "little-yafa-last-order";

export default function CheckoutPage() {
  const { locale, t } = useLanguage();
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [region, setRegion] = useState<ShippingRegion | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REGIONS: { value: ShippingRegion; label: string }[] = [
    { value: "westBank", label: t.checkout.regionWestBank },
    { value: "jerusalem", label: t.checkout.regionJerusalem },
    { value: "inside", label: t.checkout.regionInside },
    { value: "pickup", label: t.checkout.regionPickup },
  ];

  const shipping = region ? SHIPPING_RATES[region] : 0;
  const total = subtotal + shipping;
  const canSubmit = Boolean(fullName.trim() && phone.trim() && address.trim() && region);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-gutter py-xl text-center">
        <p className="font-body-lg text-on-surface-variant mb-md">{t.cart.empty}</p>
        <Link href="/" className="underline" style={{ color: "#5A5F44" }}>
          {t.cart.continueShopping}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!region) {
      setRegionError(t.checkout.regionRequired);
      return;
    }
    setRegionError(null);
    setSubmitting(true);
    try {
      const orderId = await placeOrder(items, {
        customerName: fullName,
        customerPhone: phone,
        customerAddress: address,
        customerNotes: notes,
        shippingRegion: region,
        shippingCost: SHIPPING_RATES[region],
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        <div className="bg-surface-container-lowest rounded-[2rem] p-lg cloud-shadow">
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
            <div>
              <label htmlFor="notes" className="block font-label-md text-label-md text-on-surface-variant mb-2">
                {t.checkout.additionalNotes}
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.checkout.additionalNotesPlaceholder}
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <div className="mt-lg">
            <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
              {t.checkout.deliveryRegion}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
              {REGIONS.map(({ value, label }) => {
                const active = region === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRegion(value);
                      setRegionError(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 font-label-md text-label-md transition-all active:scale-95 ${
                      active ? "text-white" : "bg-surface border-outline-variant text-on-surface hover:border-[#5A5F44]/50"
                    }`}
                    style={active ? { backgroundColor: "#5A5F44", borderColor: "#5A5F44" } : undefined}
                  >
                    <span>{label}</span>
                    {value === "pickup" && (
                      <span
                        className={`font-body-md text-[11px] text-center leading-tight ${
                          active ? "text-white/80" : "text-on-surface-variant/80"
                        }`}
                      >
                        {t.checkout.pickupAddress}
                      </span>
                    )}
                    <span className={active ? "text-white/90" : "text-on-surface-variant"}>
                      {SHIPPING_RATES[value] === 0 ? t.checkout.shippingFree : formatPrice(SHIPPING_RATES[value])}
                    </span>
                  </button>
                );
              })}
            </div>
            {regionError && <p className="font-label-sm text-label-sm text-error mt-2">{regionError}</p>}
          </div>
        </div>

        <div className="bg-surface-container-low rounded-[2rem] p-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.checkout.orderSummary}</h2>
          <div className="flex flex-col gap-4 mb-md">
            {items.map((item) => (
              <div key={`${item.productId}-${item.color}-${item.size}`} className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-lg bg-surface-container-lowest overflow-hidden shrink-0">
                  {item.image && (
                    <Image src={item.image} alt={item.name[locale]} fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-label-md text-label-md text-on-surface">{item.name[locale]}</p>
                  <p className="font-body-md text-[14px] text-on-surface-variant">
                    {t.product.color}: {getColorLabel(item, locale)} · {t.product.size}: {item.size} · Qty: {item.qty}
                  </p>
                </div>
                {item.price !== undefined && (
                  <p className="font-body-md text-on-surface">
                    <PriceTag
                      price={(item.originalPrice ?? item.price) * item.qty}
                      salePrice={item.originalPrice !== undefined ? item.price * item.qty : undefined}
                      priceClassName="text-on-surface"
                    />
                  </p>
                )}
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
              <span>{!region ? "—" : shipping === 0 ? t.checkout.shippingFree : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface">
              <span>{t.checkout.total}</span>
              <span className="text-secondary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="w-full flex items-center justify-center gap-2 px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {t.checkout.processing}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">lock</span>
              {t.cart.confirmOrder}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
