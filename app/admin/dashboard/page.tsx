"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeToOrders } from "@/lib/firebase/orders";
import { subscribeToProducts, getTotalStock } from "@/lib/firebase/products";
import { formatPrice } from "@/lib/format";
import type { Order, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";

const LOW_STOCK_THRESHOLD = 10;

export default function AdminOverviewPage() {
  const { t } = useAdminLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsubOrders = subscribeToOrders(setOrders);
    const unsubProducts = subscribeToProducts(setProducts);
    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  const newOrdersCount = orders.filter((o) => o.status === "new").length;
  const lowStockProducts = products
    .filter((p) => getTotalStock(p) > 0 && getTotalStock(p) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => getTotalStock(a) - getTotalStock(b));
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.overview.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <StatCard label={t.overview.statTotalOrders} value={orders.length} icon="receipt_long" tone="primary" />
        <StatCard label={t.overview.statNewOrders} value={newOrdersCount} icon="notification_important" tone="secondary" />
        <StatCard label={t.overview.statLowStockItems} value={lowStockProducts.length} icon="warning" tone="error" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 p-md">
          <div className="flex items-center justify-between mb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{t.overview.recentOrders}</h2>
            <Link href="/admin/dashboard/orders" className="font-label-md text-label-md text-primary hover:text-secondary transition-colors">
              {t.overview.viewAll}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
                  <th className="py-2 pe-4">{t.overview.tableOrderId}</th>
                  <th className="py-2 pe-4">{t.overview.tableCustomer}</th>
                  <th className="py-2 pe-4">{t.overview.tableStatus}</th>
                  <th className="py-2 text-end">{t.overview.tableTotal}</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b border-outline-variant/50">
                    <td className="py-3 pe-4 font-label-md text-label-md text-primary">#{order.id.slice(0, 6).toUpperCase()}</td>
                    <td className="py-3 pe-4 font-body-md text-on-surface">{order.customerName}</td>
                    <td className="py-3 pe-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 text-end font-body-md text-secondary font-semibold">{formatPrice(order.total)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-on-surface-variant font-body-md">
                      {t.overview.noOrdersYet}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-md">
            {t.overview.totalRevenue} <span className="text-secondary font-semibold">{formatPrice(totalRevenue)}</span>
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 p-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.overview.lowStock}</h2>
          <div className="flex flex-col gap-sm">
            {lowStockProducts.slice(0, 6).map((product) => (
              <div key={product.id} className="flex items-center gap-md p-sm rounded-xl bg-surface-container-low">
                <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                  {product.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-label-md text-label-md text-on-surface truncate">{product.name.en}</h5>
                  <p className="font-label-sm text-label-sm text-error">{getTotalStock(product)} {t.overview.unitsLeft}</p>
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="font-body-md text-on-surface-variant text-center py-md">{t.overview.allStockedUp}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
