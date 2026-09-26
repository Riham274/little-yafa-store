"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { formatPrice } from "@/lib/format";
import { updateOrderStatus } from "@/lib/firebase/orders";
import { getProductByIdForAdmin } from "@/lib/firebase/products";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatusBadge from "./StatusBadge";
import OrderPrintView from "./OrderPrintView";
import { proxiedImageUrl } from "@/lib/imageProxy";

// undefined = still loading, null = deleted/not found
type ProductLookup = Record<string, Product | null | undefined>;

// OrderItem.color is always the Arabic label (the stable matching key —
// see CartItem.color); resolve it to the admin's current language via the
// live product when available, falling back to the stored Arabic text.
// Exported so OrderPrintView can resolve the same labels for the printed
// items table without duplicating the lookup logic.
export function resolveColorLabel(product: Product | null | undefined, colorAr: string, locale: "en" | "ar"): string {
  const match = product?.colors.find((c) => c.label.ar === colorAr);
  return match ? match.label[locale] || match.label.ar : colorAr;
}

// Fixes an intermittent bug where some orders' printed product images came
// out blank while others printed fine: window.print() used to fire the
// instant Print was clicked, but the print view's <img> tags depend on two
// separate async steps — the per-item getProductByIdForAdmin() lookup below,
// then the <img>'s own network fetch of the resolved URL — neither of which
// had finished yet if the admin clicked Print soon after opening the drawer.
// It was never about the product image data shape itself (plain string vs.
// {url, focalPoint} both already normalize correctly through toProduct(), as
// confirmed against real products of both shapes) — purely a timing race.
// A generous timeout keeps a broken/unreachable image URL from blocking the
// print dialog forever.
async function waitForPrintImages(timeoutMs = 5000): Promise<void> {
  const printArea = document.querySelector(".print-area");
  if (!printArea) return;
  const images = Array.from(printArea.querySelectorAll("img"));
  const loaded = Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );
  await Promise.race([loaded, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

export default function OrderDetailDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t, locale } = useAdminLanguage();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);
  const [productsById, setProductsById] = useState<ProductLookup>({});
  const [zoomedItemIndex, setZoomedItemIndex] = useState<number | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const messageTextRef = useRef<HTMLDivElement>(null);
  // TEMPORARY diagnostic for a real-device bug report (print button silently
  // unresponsive on iPhone Safari): console.log isn't reachable without a
  // Mac + cable, so this on-screen banner proves whether the tap is even
  // registering. Remove once the on-device report comes back either way.
  const [showPrintTappedBanner, setShowPrintTappedBanner] = useState(false);

  useEffect(() => {
    const ids = [...new Set(order.items.map((item) => item.productId))];
    ids.forEach((id) => {
      getProductByIdForAdmin(id).then((product) => {
        setProductsById((prev) => ({ ...prev, [id]: product }));
      });
    });
  }, [order.items]);

  useEffect(() => {
    if (zoomedItemIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedItemIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedItemIndex]);

  const regionLabels: Record<string, string> = {
    westBank: t.orders.regionWestBank,
    jerusalem: t.orders.regionJerusalem,
    inside: t.orders.regionInside,
    pickup: t.orders.regionPickup,
  };
  const subtotal = order.total - order.shippingCost;

  const handleStatusChange = async (next: OrderStatus) => {
    setStatus(next);
    setSaving(true);
    try {
      await updateOrderStatus(order.id, next);
    } finally {
      setSaving(false);
    }
  };

  // Always Arabic, regardless of the admin's own UI language — this message
  // is addressed directly to the customer, not to the admin, so neither the
  // message text nor the product name (name.ar, same as the print view) nor
  // the color label (resolveColorLabel(..., "ar"), hardcoded rather than
  // `locale`) follow the admin panel's language toggle. wa.me expects digits
  // only (no "+", no spaces), same convention as the messages page's
  // WhatsApp links; `%0A` (an encoded "\n") is what actually gives WhatsApp
  // real line breaks in the pre-filled message instead of one run-on line —
  // encodeURIComponent() handles that on its own, so the template literal's
  // real newlines below just need to survive untouched into it.
  const whatsappItemLines = order.items
    .map((item, i) => {
      const product = productsById[item.productId];
      const name = product?.name.ar || item.name;
      const color = resolveColorLabel(product, item.color, "ar");
      return `${i + 1}. ${name} ${color} - سايز ${item.size} × ${item.qty}`;
    })
    .join("\n");
  const whatsappMessage = `مرحباً ${order.customerName}،
تم تأكيد طلبك رقم #${order.id.slice(0, 6).toUpperCase()} بقيمة ${order.total.toFixed(2)}₪ شامل التوصيل.

تفاصيل طلبك:
${whatsappItemLines}

سيصل طلبك خلال يومين عمل.
شكراً لاختيارك Little Yafa 🌸`;
  const whatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

  // "View Message" shows this exact same whatsappMessage text, for pasting
  // into another app (SMS, a different messenger) instead of WhatsApp.
  const openMessage = () => {
    setCopyState("idle");
    setMessageOpen(true);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Clipboard API unavailable/blocked (e.g. a non-HTTPS origin) — select
      // the text instead so it can still be copied by hand.
      if (messageTextRef.current) window.getSelection()?.selectAllChildren(messageTextRef.current);
      setCopyState("failed");
    }
  };

  const zoomedItem = zoomedItemIndex !== null ? order.items[zoomedItemIndex] : null;
  const zoomedProduct = zoomedItem ? productsById[zoomedItem.productId] : undefined;
  const zoomedImage = zoomedProduct?.colors[0]?.images[0]?.url;
  const zoomedDescription = zoomedProduct ? zoomedProduct.description[locale] : null;

  // True once every item's product lookup (see the effect above) has
  // resolved, product-not-found included — `in` checks key presence, not
  // truthiness, since a deleted product legitimately resolves to `null`.
  // Gates the print button so its click handler is never racing the async
  // fetch its own print-view images depend on (see waitForPrintImages()).
  const productsReady = order.items.every((item) => item.productId in productsById);

  const handlePrintClick = async () => {
    console.log("print button clicked");
    // flushSync so the banner actually paints before window.print() runs —
    // without it, React could batch this update to run after print()
    // returns, and on iOS the print UI can take over the screen before the
    // banner ever shows, making it look like it "never appeared" either way.
    flushSync(() => setShowPrintTappedBanner(true));
    await waitForPrintImages();
    window.print();
    setTimeout(() => setShowPrintTappedBanner(false), 3000);
  };

  return (
    <>
    {showPrintTappedBanner && (
      <div className="fixed top-4 inset-x-4 z-[200] flex justify-center pointer-events-none">
        <div className="bg-primary text-on-primary rounded-full px-6 py-3 font-label-md text-label-md shadow-lg">
          {t.orders.printTappedDebug}
        </div>
      </div>
    )}
    <OrderPrintView order={order} status={status} productsById={productsById} />
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-end md:items-center md:justify-center p-0 md:p-gutter">
      <div className="bg-surface rounded-t-[2rem] md:rounded-[2rem] cloud-shadow w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {t.orders.orderPrefix}{order.id.slice(0, 6).toUpperCase()}
          </h2>
          <div className="flex items-center -my-2 -me-2">
            <button
              onClick={handlePrintClick}
              disabled={!productsReady}
              title={t.orders.print}
              className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-primary active:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant"
            >
              <span className="material-symbols-outlined">print</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-error active:bg-error-container/20 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-lg">
          <StatusBadge status={status} />
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-md mb-md">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-2">{t.orders.customer}</h3>
          <p className="font-body-md text-on-surface">{order.customerName}</p>
          <p className="font-body-md text-on-surface-variant">{order.customerPhone}</p>
          {order.customerPhoneBackup && (
            <p className="font-body-md text-on-surface-variant">
              <span className="text-on-surface-variant/70">{t.orders.phoneBackup}: </span>
              {order.customerPhoneBackup}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-2 font-label-md text-label-md active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              {t.orders.confirmWhatsapp}
            </a>
            <button
              type="button"
              onClick={openMessage}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface text-on-surface px-4 py-2 font-label-md text-label-md active:scale-95 transition-transform hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              {t.orders.viewMessage}
            </button>
          </div>
          <p className="font-body-md text-on-surface-variant mt-2">{order.customerAddress}</p>
          {order.shippingRegion && (
            <p className="font-body-md text-on-surface-variant mt-2">
              <span className="text-on-surface-variant/70">{t.orders.deliveryRegion}: </span>
              {regionLabels[order.shippingRegion]}
            </p>
          )}
          {order.customerNotes && (
            <p className="font-body-md text-on-surface-variant mt-2">
              <span className="text-on-surface-variant/70">{t.orders.notes}: </span>
              {order.customerNotes}
            </p>
          )}
        </div>

        <div className="bg-surface-container-low rounded-2xl p-md mb-md">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-2">{t.orders.items}</h3>
          <div className="flex flex-col gap-3">
            {order.items.map((item, i) => {
              const product = productsById[item.productId];
              const image = product?.colors[0]?.images[0]?.url;
              const description = product ? product.description[locale] : null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setZoomedItemIndex(i)}
                  className="flex items-start gap-3 w-full text-start rounded-xl p-1 -m-1 hover:bg-surface-container/60 transition-colors cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-lg bg-surface-container overflow-hidden shrink-0">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proxiedImageUrl(image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined">image_not_supported</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface">{item.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      ({t.orders.color}: {resolveColorLabel(product, item.color, locale)} · {t.orders.size}: {item.size}) × {item.qty}
                    </p>
                    {product === null ? (
                      <p className="font-label-sm text-label-sm text-error mt-0.5">{t.orders.productUnavailable}</p>
                    ) : description ? (
                      <p className="font-label-sm text-label-sm text-on-surface-variant/80 mt-0.5 line-clamp-2">{description}</p>
                    ) : null}
                  </div>
                  <span className="text-on-surface font-body-md shrink-0">{formatPrice(item.price * item.qty)}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t gold-border mt-3 pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between font-body-md text-on-surface-variant">
              <span>{t.orders.subtotal}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between font-body-md text-on-surface-variant">
              <span>{t.orders.shipping}</span>
              <span>{formatPrice(order.shippingCost)}</span>
            </div>
            <div className="flex items-center justify-between font-headline-sm text-headline-sm text-on-surface">
              <span>{t.orders.total}</span>
              <span className="text-secondary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{t.orders.updateStatus}</label>
          <select
            value={status}
            disabled={saving}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            className="w-full bg-surface-container-low rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface disabled:opacity-70"
          >
            <option value="new">{t.orders.statusNew}</option>
            <option value="processing">{t.orders.statusProcessing}</option>
            <option value="delivered">{t.orders.statusDelivered}</option>
          </select>
        </div>
      </div>
    </div>

    {zoomedItem && (
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-gutter"
        onClick={() => setZoomedItemIndex(null)}
      >
        <div
          className="bg-surface rounded-[2rem] cloud-shadow w-full max-w-md max-h-[90vh] overflow-y-auto p-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{zoomedItem.name}</h2>
            <button
              onClick={() => setZoomedItemIndex(null)}
              className="flex items-center justify-center w-11 h-11 -my-2 -me-2 rounded-full text-on-surface-variant hover:text-error active:bg-error-container/20 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="w-full aspect-square rounded-2xl bg-surface-container overflow-hidden mb-md">
            {zoomedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proxiedImageUrl(zoomedImage)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[64px]">image_not_supported</span>
              </div>
            )}
          </div>

          {zoomedProduct === null ? (
            <p className="font-label-sm text-label-sm text-error mb-md">{t.orders.productUnavailable}</p>
          ) : zoomedDescription ? (
            <p className="font-body-md text-on-surface-variant mb-md">{zoomedDescription}</p>
          ) : null}

          <div className="flex flex-col gap-1.5 font-body-md text-on-surface bg-surface-container-low rounded-2xl p-md">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{t.orders.color}</span>
              <span>{resolveColorLabel(zoomedProduct, zoomedItem.color, locale)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{t.orders.size}</span>
              <span>{zoomedItem.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{t.orders.quantity}</span>
              <span>{zoomedItem.qty}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">{t.orders.price}</span>
              <span className="text-secondary font-semibold">{formatPrice(zoomedItem.price * zoomedItem.qty)}</span>
            </div>
          </div>
        </div>
      </div>
    )}

    {messageOpen && (
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-gutter"
        onClick={() => setMessageOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-message-title"
          className="bg-surface rounded-[2rem] cloud-shadow w-full max-w-md max-h-[90vh] overflow-y-auto p-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-md">
            <h2 id="order-message-title" className="font-headline-sm text-headline-sm text-on-surface">
              {t.orders.messageTitle}
            </h2>
            <button
              onClick={() => setMessageOpen(false)}
              className="flex items-center justify-center w-11 h-11 -my-2 -me-2 rounded-full text-on-surface-variant hover:text-error active:bg-error-container/20 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Always Arabic, like the message itself — so dir="rtl" even
              when the admin panel is in English. A pre-wrap block (not a
              textarea) so it grows to fit however the lines wrap on a
              narrow screen, instead of cutting off the last lines. */}
          <div
            ref={messageTextRef}
            dir="rtl"
            className="whitespace-pre-wrap select-text bg-surface-container-low rounded-2xl border border-outline-variant p-md font-body-md text-on-surface mb-md"
          >
            {whatsappMessage}
          </div>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full flex items-center justify-center gap-2 px-lg py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copyState === "copied" ? "check" : "content_copy"}
            </span>
            {copyState === "copied" ? t.orders.messageCopied : t.orders.copyMessage}
          </button>
          {copyState === "failed" && (
            <p className="font-label-sm text-label-sm text-error mt-2 text-center">{t.orders.copyFailed}</p>
          )}
        </div>
      </div>
    )}
    </>
  );
}
