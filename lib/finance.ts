import type { Order } from "./types";

export type FinancePeriod = "today" | "week" | "month";

/** Start-of-period timestamp in the caller's local time. Week starts Sunday
 * (day 0), matching the regional convention this store operates in. */
export function getPeriodStart(period: FinancePeriod, now: Date = new Date()): number {
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (period === "week") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export type ProductSalesBreakdown = {
  productId: string;
  fallbackName: string;
  qty: number;
  revenue: number;
  profit: number;
  missingCostPrice: boolean;
};

export type FinanceSummary = {
  totalSales: number;
  netProfit: number;
  orderCount: number;
  hasMissingCostPrice: boolean;
  byProduct: ProductSalesBreakdown[];
};

/** Sums sales/profit across every item of every order placed within the
 * period, regardless of order status. Profit for an item is
 * `(price - costPrice) * qty`; a product with no cost price set (undefined
 * or 0 — an admin never intentionally prices sourcing at ₪0) contributes 0
 * profit rather than counting its full revenue as profit, and flips
 * `hasMissingCostPrice`/`missingCostPrice` so the UI can warn the figure may
 * be incomplete. */
export function computeFinanceSummary(
  orders: Order[],
  costPriceByProductId: Map<string, number>,
  periodStart: number
): FinanceSummary {
  const periodOrders = orders.filter((o) => o.createdAt >= periodStart);

  let totalSales = 0;
  let netProfit = 0;
  let hasMissingCostPrice = false;
  const byProduct = new Map<string, ProductSalesBreakdown>();

  for (const order of periodOrders) {
    for (const item of order.items) {
      const revenue = item.price * item.qty;
      totalSales += revenue;

      const costPrice = costPriceByProductId.get(item.productId);
      const missingCostPrice = costPrice === undefined || costPrice === 0;
      const profit = missingCostPrice ? 0 : (item.price - costPrice) * item.qty;
      netProfit += profit;
      if (missingCostPrice) hasMissingCostPrice = true;

      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.qty += item.qty;
        existing.revenue += revenue;
        existing.profit += profit;
        existing.missingCostPrice = existing.missingCostPrice || missingCostPrice;
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          fallbackName: item.name,
          qty: item.qty,
          revenue,
          profit,
          missingCostPrice,
        });
      }
    }
  }

  return {
    totalSales,
    netProfit,
    orderCount: periodOrders.length,
    hasMissingCostPrice,
    byProduct: [...byProduct.values()],
  };
}
