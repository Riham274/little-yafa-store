"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveOrder, subscribeToOrders, unarchiveOrder } from "@/lib/firebase/orders";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatusBadge from "@/components/admin/StatusBadge";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";
import StatCard from "@/components/admin/StatCard";

type OrdersView = "active" | "archived";

export default function AdminOrdersPage() {
  const { t } = useAdminLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [view, setView] = useState<OrdersView>("active");
  const [selected, setSelected] = useState<Order | null>(null);
  const [autoPrintId, setAutoPrintId] = useState<string | null>(null);

  useEffect(() => subscribeToOrders(setOrders), []);

  const activeOrders = useMemo(() => orders.filter((o) => !o.archived), [orders]);

  const filtered = useMemo(() => {
    const scoped = view === "archived" ? orders.filter((o) => o.archived) : activeOrders;
    return scoped.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || order.id.toLowerCase().includes(q) || order.customerName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, activeOrders, view, search, statusFilter]);

  // Headline stats always describe the active/operational order set,
  // regardless of which tab is currently open — archiving an order
  // shouldn't make it vanish from Finance-style totals, just from the list.
  const newCount = activeOrders.filter((o) => o.status === "new").length;
  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);

  const handleArchive = async (order: Order) => {
    if (!window.confirm(t.orders.archiveConfirm)) return;
    await archiveOrder(order.id);
  };

  const handleUnarchive = async (order: Order) => {
    await unarchiveOrder(order.id);
  };

  const handleQuickPrint = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(order);
    setAutoPrintId(order.id);
  };

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.orders.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <StatCard label={t.orders.statTotalOrders} value={activeOrders.length} icon="receipt_long" tone="primary" />
        <StatCard label={t.orders.statNewOrders} value={newCount} icon="pending_actions" tone="secondary" />
        <StatCard label={t.orders.statTotalRevenue} value={formatPrice(totalRevenue)} icon="payments" tone="primary" />
      </div>

      <div className="inline-flex bg-surface-container-low rounded-full p-1 mb-md">
        {(["active", "archived"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
              view === v ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {v === "active" ? t.orders.tabActive : t.orders.tabArchived}
          </button>
        ))}
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

      {/* Desktop table */}
      <div className="hidden md:block bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
              <th className="py-3 px-md">{t.orders.tableOrderId}</th>
              <th className="py-3 px-md">{t.orders.tableCustomer}</th>
              <th className="py-3 px-md">{t.orders.tableStatus}</th>
              <th className="py-3 px-md text-end">{t.orders.tableTotal}</th>
              <th className="py-3 px-md text-end">{t.orders.tableDate}</th>
              <th className="py-3 px-md text-end normal-case">{t.common.actions}</th>
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
                <td className="py-3 px-md text-end">
                  <div className="flex justify-end items-center gap-3">
                    <button
                      onClick={(e) => handleQuickPrint(order, e)}
                      title={t.orders.print}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">print</span>
                    </button>
                    {order.archived ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(order);
                        }}
                        title={t.orders.unarchiveOrder}
                        className="text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined">unarchive</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(order);
                        }}
                        title={t.orders.archiveOrder}
                        className="text-on-surface-variant hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined">archive</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant font-body-md">
                  {t.orders.noOrdersFound}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — same pattern as the Products page: key info stacked
          in one column, tapping the card opens the same detail drawer a
          row-click would, and every action is its own ≥44px touch target
          in a dedicated row so nothing needs pinch-zoom or horizontal
          hunting to reach. */}
      <div className="md:hidden flex flex-col gap-sm">
        {filtered.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelected(order)}
            className="bg-surface-container-lowest rounded-2xl cloud-shadow p-md cursor-pointer active:bg-surface-container-low transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-label-md text-label-md text-primary">#{order.id.slice(0, 6).toUpperCase()}</p>
                <p className="font-body-md text-on-surface">{order.customerName}</p>
              </div>
              <p className="font-body-md text-secondary font-bold whitespace-nowrap">{formatPrice(order.total)}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <StatusBadge status={order.status} />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-outline-variant/50">
              <button
                onClick={(e) => handleQuickPrint(order, e)}
                title={t.orders.print}
                className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-primary active:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">print</span>
              </button>
              {order.archived ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnarchive(order);
                  }}
                  title={t.orders.unarchiveOrder}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-primary active:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">unarchive</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(order);
                  }}
                  title={t.orders.archiveOrder}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-error active:bg-error-container/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">archive</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-on-surface-variant font-body-md">{t.orders.noOrdersFound}</p>
        )}
      </div>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          autoPrint={autoPrintId === selected.id}
          onClose={() => {
            setSelected(null);
            setAutoPrintId(null);
          }}
        />
      )}
    </div>
  );
}
