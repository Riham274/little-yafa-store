"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToOrders } from "@/lib/firebase/orders";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import StatusBadge from "@/components/admin/StatusBadge";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";
import StatCard from "@/components/admin/StatCard";

export default function AdminOrdersPage() {
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
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">Orders</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <StatCard label="Total Orders" value={orders.length} icon="receipt_long" tone="primary" />
        <StatCard label="New Orders" value={newCount} icon="pending_actions" tone="secondary" />
        <StatCard label="Total Revenue" value={formatPrice(totalRevenue)} icon="payments" tone="primary" />
      </div>

      <div className="flex flex-col md:flex-row gap-sm mb-md">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order ID or Name..."
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant pl-10 pr-4 py-3 font-body-md text-on-surface"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="processing">Processing</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
              <th className="py-3 px-md">Order ID</th>
              <th className="py-3 px-md">Customer</th>
              <th className="py-3 px-md">Status</th>
              <th className="py-3 px-md text-right">Total</th>
              <th className="py-3 px-md text-right">Date</th>
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
                <td className="py-3 px-md text-right font-body-md text-secondary font-bold">{formatPrice(order.total)}</td>
                <td className="py-3 px-md text-right font-label-sm text-label-sm text-on-surface-variant">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant font-body-md">
                  No orders found.
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
