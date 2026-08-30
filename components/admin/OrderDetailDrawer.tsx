"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { updateOrderStatus } from "@/lib/firebase/orders";
import { getProductByIdForAdmin } from "@/lib/firebase/products";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatusBadge from "./StatusBadge";
import OrderPrintView from "./OrderPrintView";

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

export default function OrderDetailDrawer({
  order,
  onClose,
  autoPrint = false,
}: {
  order: Order;
  onClose: () => void;
  // Set when opened via the Orders list row's quick-print button, so the
  // print dialog fires as soon as the order's data (and print-only markup)
  // has actually mounted, instead of the admin needing to open the drawer
  // and then separately find/click the print button inside it.
  autoPrint?: boolean;
}) {
  const { t, locale } = useAdminLanguage();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);
  const [productsById, setProductsById] = useState<ProductLookup>({});
  const [zoomedItemIndex, setZoomedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const ids = [...new Set(order.items.map((item) => item.productId))];
    ids.forEach((id) => {
      getProductByIdForAdmin(id).then((product) => {
        setProductsById((prev) => ({ ...prev, [id]: product }));
      });
    });
  }, [order.items]);

  useEffect(() => {
    if (!autoPrint) return;
    // A tick to let the print-only markup actually mount before the browser
    // snapshots the page for the print dialog.
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, [autoPrint]);

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

  const zoomedItem = zoomedItemIndex !== null ? order.items[zoomedItemIndex] : null;
  const zoomedProduct = zoomedItem ? productsById[zoomedItem.productId] : undefined;
  const zoomedImage = zoomedProduct?.colors[0]?.images[0];
  const zoomedDescription = zoomedProduct ? zoomedProduct.description[locale] : null;

  return (
    <>
    <OrderPrintView order={order} status={status} productsById={productsById} />
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-end md:items-center md:justify-center p-0 md:p-gutter">
      <div className="bg-surface rounded-t-[2rem] md:rounded-[2rem] cloud-shadow w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {t.orders.orderPrefix}{order.id.slice(0, 6).toUpperCase()}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              title={t.orders.print}
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">print</span>
            </button>
            <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
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
          <p className="font-body-md text-on-surface-variant">{order.customerAddress}</p>
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
              const image = product?.colors[0]?.images[0];
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
                      <img src={image} alt="" className="w-full h-full object-cover" />
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
              className="text-on-surface-variant hover:text-error transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="w-full aspect-square rounded-2xl bg-surface-container overflow-hidden mb-md">
            {zoomedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={zoomedImage} alt="" className="w-full h-full object-cover" />
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
    </>
  );
}
