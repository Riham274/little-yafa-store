"use client";

import type { OrderStatus } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";

const STYLES: Record<OrderStatus, string> = {
  new: "bg-secondary-container text-on-secondary-container",
  processing: "bg-primary-container/20 text-primary border border-primary/20",
  delivered: "bg-surface-variant text-on-surface-variant",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useAdminLanguage();
  const labels: Record<OrderStatus, string> = {
    new: t.orders.statusNew,
    processing: t.orders.statusProcessing,
    delivered: t.orders.statusDelivered,
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full font-label-sm text-label-sm font-bold ${STYLES[status]}`}>
      {labels[status]}
    </span>
  );
}
