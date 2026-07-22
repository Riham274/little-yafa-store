import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  new: "bg-secondary-container text-on-secondary-container",
  processing: "bg-primary-container/20 text-primary border border-primary/20",
  delivered: "bg-surface-variant text-on-surface-variant",
};

const LABELS: Record<OrderStatus, string> = {
  new: "New",
  processing: "Processing",
  delivered: "Delivered",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex px-3 py-1 rounded-full font-label-sm text-label-sm font-bold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
