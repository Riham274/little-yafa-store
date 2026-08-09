"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { updateOrderStatus } from "@/lib/firebase/orders";
import { getProductByIdForAdmin } from "@/lib/firebase/products";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatusBadge from "./StatusBadge";

// undefined = still loading, null = deleted/not found
type ProductLookup = Record<string, Product | null | undefined>;

export default function OrderDetailDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t, locale } = useAdminLanguage();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);
  const [productsById, setProductsById] = useState<ProductLookup>({});

  useEffect(() => {
    const ids = [...new Set(order.items.map((item) => item.productId))];
    ids.forEach((id) => {
      getProductByIdForAdmin(id).then((product) => {
        setProductsById((prev) => ({ ...prev, [id]: product }));
      });
    });
  }, [order.items]);

  const regionLabels: Record<string, string> = {
    westBank: t.orders.regionWestBank,
    jerusalem: t.orders.regionJerusalem,
    inside: t.orders.regionInside,
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

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-end md:items-center md:justify-center p-0 md:p-gutter">
      <div className="bg-surface rounded-t-[2rem] md:rounded-[2rem] cloud-shadow w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {t.orders.orderPrefix}{order.id.slice(0, 6).toUpperCase()}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
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
              const image = product?.images[0];
              const description = product ? product.description[locale] : null;
              return (
                <div key={i} className="flex items-start gap-3">
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
                      ({t.orders.size}: {item.size}) × {item.qty}
                    </p>
                    {product === null ? (
                      <p className="font-label-sm text-label-sm text-error mt-0.5">{t.orders.productUnavailable}</p>
                    ) : description ? (
                      <p className="font-label-sm text-label-sm text-on-surface-variant/80 mt-0.5 line-clamp-2">{description}</p>
                    ) : null}
                  </div>
                  <span className="text-on-surface font-body-md shrink-0">{formatPrice(item.price * item.qty)}</span>
                </div>
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
  );
}
