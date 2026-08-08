"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { updateOrderStatus } from "@/lib/firebase/orders";
import type { Order, OrderStatus } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatusBadge from "./StatusBadge";

export default function OrderDetailDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useAdminLanguage();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);

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
          <div className="flex flex-col gap-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between font-body-md">
                <span className="text-on-surface">
                  {item.name} <span className="text-on-surface-variant">× {item.qty}</span>
                </span>
                <span className="text-on-surface">{formatPrice(item.price * item.qty)}</span>
              </div>
            ))}
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
