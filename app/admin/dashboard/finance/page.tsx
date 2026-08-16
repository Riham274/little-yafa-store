"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToOrders } from "@/lib/firebase/orders";
import { subscribeToProducts } from "@/lib/firebase/products";
import { computeFinanceSummary, getPeriodStart, type FinancePeriod } from "@/lib/finance";
import { formatPrice } from "@/lib/format";
import type { Order, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatCard from "@/components/admin/StatCard";

const PERIODS: FinancePeriod[] = ["today", "week", "month"];
type SortKey = "revenue" | "profit";

export default function AdminFinancePage() {
  const { t, locale } = useAdminLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [period, setPeriod] = useState<FinancePeriod>("today");
  const [sortBy, setSortBy] = useState<SortKey>("revenue");

  useEffect(() => {
    const unsubOrders = subscribeToOrders(setOrders);
    const unsubProducts = subscribeToProducts(setProducts);
    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  const periodLabels: Record<FinancePeriod, string> = {
    today: t.finance.periodToday,
    week: t.finance.periodWeek,
    month: t.finance.periodMonth,
  };

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const summary = useMemo(() => {
    const costPriceByProductId = new Map<string, number>();
    for (const product of products) {
      if (product.costPrice !== undefined) costPriceByProductId.set(product.id, product.costPrice);
    }
    return computeFinanceSummary(orders, costPriceByProductId, getPeriodStart(period));
  }, [orders, products, period]);

  const sortedByProduct = useMemo(
    () => [...summary.byProduct].sort((a, b) => b[sortBy] - a[sortBy]),
    [summary.byProduct, sortBy]
  );

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.finance.title}</h1>

      <div className="inline-flex bg-surface-container-low rounded-full p-1 mb-lg">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
              period === p ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <StatCard label={t.finance.statTotalSales} value={formatPrice(summary.totalSales)} icon="payments" tone="primary" />
        <StatCard
          label={t.finance.statNetProfit}
          value={formatPrice(summary.netProfit)}
          icon="trending_up"
          tone="secondary"
        />
        <StatCard label={t.finance.statOrderCount} value={summary.orderCount} icon="receipt_long" tone="primary" />
      </div>

      {summary.hasMissingCostPrice && (
        <div className="flex items-start gap-2 bg-secondary-container/30 text-on-secondary-container rounded-xl px-4 py-3 mb-lg font-label-md text-label-md">
          <span className="material-symbols-outlined text-[20px] shrink-0">warning</span>
          {t.finance.missingCostPriceWarning}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden">
        <div className="flex items-center justify-between p-md pb-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{t.products.tableProduct}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy("revenue")}
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                sortBy === "revenue"
                  ? "bg-primary-container/30 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {t.finance.sortByRevenue}
            </button>
            <button
              onClick={() => setSortBy("profit")}
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                sortBy === "profit"
                  ? "bg-primary-container/30 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {t.finance.sortByProfit}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
                <th className="py-3 px-md">{t.finance.tableProduct}</th>
                <th className="py-3 px-md text-end">{t.finance.tableQtySold}</th>
                <th className="py-3 px-md text-end">{t.finance.tableRevenue}</th>
                <th className="py-3 px-md text-end">{t.finance.tableProfit}</th>
              </tr>
            </thead>
            <tbody>
              {sortedByProduct.map((row) => {
                const product = productById.get(row.productId);
                const name = product ? product.name[locale] : row.fallbackName;
                const image = product?.colors[0]?.images[0];
                return (
                  <tr key={row.productId} className="border-b border-outline-variant/50">
                    <td className="py-3 px-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0">
                          {image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="font-body-md text-on-surface">{name}</span>
                        {row.missingCostPrice && (
                          <span
                            title={t.finance.missingCostPriceWarning}
                            className="material-symbols-outlined text-[16px] text-on-secondary-container"
                          >
                            warning
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-md text-end font-body-md text-on-surface">{row.qty}</td>
                    <td className="py-3 px-md text-end font-body-md text-secondary font-semibold">
                      {formatPrice(row.revenue)}
                    </td>
                    <td className="py-3 px-md text-end font-body-md text-on-surface">{formatPrice(row.profit)}</td>
                  </tr>
                );
              })}
              {sortedByProduct.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant font-body-md">
                    {t.finance.noSales}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
