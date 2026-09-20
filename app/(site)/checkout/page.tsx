"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { getColorLabel } from "@/lib/colorLabel";
import { placeOrder, InsufficientStockError } from "@/lib/firebase/orders";
import { logOrderError } from "@/lib/firebase/orderErrors";
import { SHIPPING_RATES } from "@/lib/shipping";
import type { ShippingRegion, Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import PriceTag from "@/components/product/PriceTag";
import { getCartSessionId } from "@/lib/cartSession";
import { deleteCartSession } from "@/lib/firebase/cartSessions";
import { getCheckoutIdempotencyKey, resetCheckoutIdempotencyKey } from "@/lib/checkoutIdempotency";
import { CHECKOUT_DRAFT_SAVE_DEBOUNCE_MS, clearCheckoutDraft, loadCheckoutDraft, saveCheckoutDraft } from "@/lib/checkoutDraft";
import { COUNTRY_CODES, DEFAULT_COUNTRY_DIAL, countryName } from "@/lib/countryCodes";

const LAST_ORDER_KEY = "little-yafa-last-order";

// Combines a country-code select's value with the free-text local number
// into the single "+<dial><digits>" international format used for storage
// and everywhere else phone numbers appear (e.g. the admin WhatsApp link).
// Strips a leading 0 from the local part — customers used to dialing
// locally (e.g. "0599999999") often type it that way out of habit, but the
// international form drops it (e.g. "+970599999999").
function combinePhone(dial: string, number: string): string {
  const digits = number.replace(/\D/g, "").replace(/^0+/, "");
  return `+${dial}${digits}`;
}

export default function CheckoutPage() {
  const { locale, t } = useLanguage();
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_DIAL);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneBackupCountryCode, setPhoneBackupCountryCode] = useState(DEFAULT_COUNTRY_DIAL);
  const [phoneBackupNumber, setPhoneBackupNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [region, setRegion] = useState<ShippingRegion | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Silently pre-fills whatever was last saved — no "restore?" prompt like
  // the admin product form's version, since this is just the customer's
  // own contact/address details with no translation side effect to warn
  // about. Runs once on mount.
  useEffect(() => {
    const draft = loadCheckoutDraft();
    if (!draft) return;
    setFullName(draft.fullName);
    setPhoneCountryCode(draft.phoneCountryCode);
    setPhoneNumber(draft.phoneNumber);
    setPhoneBackupCountryCode(draft.phoneBackupCountryCode);
    setPhoneBackupNumber(draft.phoneBackupNumber);
    setAddress(draft.address);
    setNotes(draft.notes);
    setRegion(draft.region);
  }, []);

  // Holds the currently-pending debounced-save timer so handleSubmit's
  // success path can cancel it explicitly (see below) — without this, a
  // timer already scheduled from an edit made just before submitting could
  // still be sitting there un-fired (it's only 2.5s, but placeOrder's own
  // network round-trip can easily take that long), and would fire and
  // silently re-write the draft AFTER clearCheckoutDraft() just cleared it
  // — the component doesn't unmount (which would cancel it) until the
  // router.push() navigation actually completes.
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Silent debounced autosave — fires a couple seconds after the customer
  // stops typing/changing a field, so a reload or accidental navigation
  // (that isn't a completed order — see handleSubmit's success path, the
  // only place this draft gets cleared) doesn't lose what they've entered.
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCheckoutDraft({
        fullName,
        phoneCountryCode,
        phoneNumber,
        phoneBackupCountryCode,
        phoneBackupNumber,
        address,
        notes,
        region,
      });
    }, CHECKOUT_DRAFT_SAVE_DEBOUNCE_MS);
    draftSaveTimer.current = timer;
    return () => clearTimeout(timer);
  }, [fullName, phoneCountryCode, phoneNumber, phoneBackupCountryCode, phoneBackupNumber, address, notes, region]);

  const REGIONS: { value: ShippingRegion; label: string }[] = [
    { value: "westBank", label: t.checkout.regionWestBank },
    { value: "jerusalem", label: t.checkout.regionJerusalem },
    { value: "inside", label: t.checkout.regionInside },
    { value: "pickup", label: t.checkout.regionPickup },
  ];

  const shipping = region ? SHIPPING_RATES[region] : 0;
  const total = subtotal + shipping;
  const canSubmit = Boolean(fullName.trim() && phoneNumber.trim() && address.trim() && region);

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
    const fullPhone = combinePhone(phoneCountryCode, phoneNumber);
    const fullBackupPhone = phoneBackupNumber.trim() ? combinePhone(phoneBackupCountryCode, phoneBackupNumber) : undefined;
    try {
      const orderId = await placeOrder(
        items,
        {
          customerName: fullName,
          customerPhone: fullPhone,
          ...(fullBackupPhone ? { customerPhoneBackup: fullBackupPhone } : {}),
          customerAddress: address,
          customerNotes: notes,
          shippingRegion: region,
          shippingCost: SHIPPING_RATES[region],
        },
        getCheckoutIdempotencyKey()
      );

      window.sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          id: orderId,
          items,
          total,
          createdAt: Date.now(),
        })
      );

      // The order is now the durable record of what was in this cart — its
      // anonymous "pending" tracking doc is no longer pending anything.
      // Best-effort: a failure here shouldn't block the order confirmation
      // the customer is already past.
      deleteCartSession(getCartSessionId()).catch(() => {});

      // Must happen before this success path is done — otherwise the NEXT
      // real order placed in this same browser tab would reuse today's key
      // and get silently treated as a duplicate of this one.
      resetCheckoutIdempotencyKey();

      // The order is placed — these details aren't a draft of anything
      // pending anymore. Only cleared here (order success), never just for
      // navigating away, so a customer who goes back to the cart mid-
      // checkout still finds everything filled in if they return to finish.
      // Cancelling the pending autosave timer first is required, not just
      // tidy — otherwise a save already scheduled from an edit made right
      // before submitting could still fire after this clear (the component
      // hasn't unmounted yet at this point in the async handler) and
      // silently write the draft right back.
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
      clearCheckoutDraft();

      clear();
      router.push(`/order-confirmation/${orderId}`);
    } catch (err) {
      // Always logged, even though a customer-facing message is also shown
      // below — this is what turns a vague "it didn't work for me" report
      // into something diagnosable, instead of a silently swallowed error
      // with no trace once the tab closes.
      console.error("[checkout] placeOrder failed:", err);

      const errorCode = typeof (err as { code?: unknown })?.code === "string" ? (err as { code: string }).code : null;
      const looksOffline =
        (typeof navigator !== "undefined" && navigator.onLine === false) ||
        errorCode === "unavailable" ||
        errorCode === "deadline-exceeded";

      if (err instanceof InsufficientStockError) {
        setError(
          t.checkout.errorStock
            .replace("{name}", err.productName)
            .replace("{stock}", String(err.available))
        );
      } else if (looksOffline) {
        setError(t.checkout.errorOffline);
      } else {
        setError(t.checkout.errorGeneric);
      }
      setSubmitting(false);

      // Best-effort, durable supplement to the console.error above — must
      // never block or delay the customer's own error message/retry, so
      // failures here are swallowed (after being logged themselves).
      logOrderError({
        items,
        customerName: fullName,
        customerPhone: fullPhone,
        subtotal,
        error: err,
      }).catch((logErr) => console.error("[checkout] failed to log order error:", logErr));
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
            <PhoneNumberField
              idPrefix="phone"
              label={t.checkout.phone}
              countryCode={phoneCountryCode}
              onCountryCodeChange={setPhoneCountryCode}
              number={phoneNumber}
              onNumberChange={setPhoneNumber}
              required
              locale={locale}
              t={t}
            />
            <PhoneNumberField
              idPrefix="phoneBackup"
              label={t.checkout.phoneBackup}
              countryCode={phoneBackupCountryCode}
              onCountryCodeChange={setPhoneBackupCountryCode}
              number={phoneBackupNumber}
              onNumberChange={setPhoneBackupNumber}
              locale={locale}
              t={t}
            />
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
                      {value === "pickup"
                        ? t.checkout.pickupFeeLabel
                        : SHIPPING_RATES[value] === 0
                          ? t.checkout.shippingFree
                          : formatPrice(SHIPPING_RATES[value])}
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

// Shared by both the main and backup phone fields — a country-code <select>
// (native type-ahead doubles as the "searchable list" the country name is
// shown for) plus a plain local-number input, combined into one
// international-format string right before submit (see combinePhone above).
function PhoneNumberField({
  idPrefix,
  label,
  countryCode,
  onCountryCodeChange,
  number,
  onNumberChange,
  required,
  locale,
  t,
}: {
  idPrefix: string;
  label: string;
  countryCode: string;
  onCountryCodeChange: (dial: string) => void;
  number: string;
  onNumberChange: (value: string) => void;
  required?: boolean;
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <div>
      <label htmlFor={`${idPrefix}-number`} className="block font-label-md text-label-md text-on-surface-variant mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative shrink-0 w-36">
          <select
            id={`${idPrefix}-country-code`}
            aria-label={t.checkout.countryCodeLabel}
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            className="appearance-none w-full bg-surface rounded-xl border border-outline-variant ps-8 pe-2 py-3 font-body-md text-[14px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.iso} value={c.dial}>
                +{c.dial} {countryName(c, locale)}
              </option>
            ))}
          </select>
          <span className="absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
          </span>
        </div>
        <input
          id={`${idPrefix}-number`}
          type="tel"
          required={required}
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder={t.checkout.phoneNumberPlaceholder}
          className="flex-1 min-w-0 bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
      </div>
    </div>
  );
}
