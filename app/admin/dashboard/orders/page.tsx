"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToOrders } from "@/lib/firebase/orders";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatusBadge from "@/components/admin/StatusBadge";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";
import StatCard from "@/components/admin/StatCard";

export default function AdminOrdersPage() {
  const { t } = useAdminLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => subscribeToOrders(setOrders), []);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || order.id.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const newCount = orders.filter((o) => o.status === "new").length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.orders.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <StatCard label={t.orders.statTotalOrders} value={orders.length} icon="receipt_long" tone="primary" />
        <StatCard label={t.orders.statNewOrders} value={newCount} icon="pending_actions" tone="secondary" />
        <StatCard label={t.orders.statTotalRevenue} value={formatPrice(totalRevenue)} icon="payments" tone="primary" />
      </div>

      <div className="flex flex-col md:flex-row gap-sm mb-md">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.orders.searchPlaceholder}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant ps-10 pe-4 py-3 font-body-md text-on-surface"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface"
        >
          <option value="all">{t.orders.filterAllStatuses}</option>
          <option value="new">{t.orders.statusNew}</option>
          <option value="processing">{t.orders.statusProcessing}</option>
          <option value="delivered">{t.orders.statusDelivered}</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
              <th className="py-3 px-md">{t.orders.tableOrderId}</th>
              <th className="py-3 px-md">{t.orders.tableCustomer}</th>
              <th className="py-3 px-md">{t.orders.tableStatus}</th>
              <th className="py-3 px-md text-end">{t.orders.tableTotal}</th>
              <th className="py-3 px-md text-end">{t.orders.tableDate}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr
                key={order.id}
                onClick={() => setSelected(order)}
                className="border-b border-outline-variant/50 cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <td className="py-3 px-md font-label-md text-label-md text-primary">#{order.id.slice(0, 6).toUpperCase()}</td>
                <td className="py-3 px-md font-body-md text-on-surface">{order.customerName}</td>
                <td className="py-3 px-md">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-3 px-md text-end font-body-md text-secondary font-bold">{formatPrice(order.total)}</td>
                <td className="py-3 px-md text-end font-label-sm text-label-sm text-on-surface-variant">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant font-body-md">
                  {t.orders.noOrdersFound}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <OrderDetailDrawer order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
