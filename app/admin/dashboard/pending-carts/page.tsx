"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeToCartSessions, type CartSession } from "@/lib/firebase/cartSessions";
import { getProductByIdForAdmin } from "@/lib/firebase/products";
import { formatPrice } from "@/lib/format";
import { formatRelativeTime } from "@/lib/relativeTime";
import type { Category, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatCard from "@/components/admin/StatCard";
import { proxiedImageUrl } from "@/lib/imageProxy";

// undefined = still loading, null = deleted/not found — same convention as
// OrderDetailDrawer's ProductLookup.
type ProductLookup = Record<string, Product | null | undefined>;

type Tab = "mostWanted" | "sessions";

type MostWantedRow = {
  productId: string;
  sessionCount: number;
  totalQty: number;
};

function resolveColorLabel(product: Product | null | undefined, colorAr: string, locale: "en" | "ar"): string {
  const match = product?.colors.find((c) => c.label.ar === colorAr);
  return match ? match.label[locale] || match.label.ar : colorAr;
}

export default function PendingCartsPage() {
  const { t, locale } = useAdminLanguage();
  const [sessions, setSessions] = useState<CartSession[]>([]);
  const [productsById, setProductsById] = useState<ProductLookup>({});
  const fetchedIds = useRef<Set<string>>(new Set());
  // One section at a time instead of one long scrolling page; the category
  // filter narrows whichever tab is showing.
  const [tab, setTab] = useState<Tab>("mostWanted");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  useEffect(() => subscribeToCartSessions(setSessions), []);

  useEffect(() => {
    const ids = new Set<string>();
    sessions.forEach((session) => session.items.forEach((item) => ids.add(item.productId)));
    ids.forEach((id) => {
      if (fetchedIds.current.has(id)) return;
      fetchedIds.current.add(id);
      getProductByIdForAdmin(id).then((product) => {
        setProductsById((prev) => ({ ...prev, [id]: product }));
      });
    });
  }, [sessions]);

  // Count each product once per distinct session even if it appears as
  // multiple line items within that session (e.g. two sizes of one
  // product), while still summing quantity across every matching line.
  const mostWanted: MostWantedRow[] = useMemo(() => {
    const sessionQtyByProduct = new Map<string, number>();
    const sessionCountByProduct = new Map<string, number>();
    sessions.forEach((session) => {
      const qtyInThisSession = new Map<string, number>();
      session.items.forEach((item) => {
        qtyInThisSession.set(item.productId, (qtyInThisSession.get(item.productId) ?? 0) + item.qty);
      });
      qtyInThisSession.forEach((qty, productId) => {
        sessionQtyByProduct.set(productId, (sessionQtyByProduct.get(productId) ?? 0) + qty);
        sessionCountByProduct.set(productId, (sessionCountByProduct.get(productId) ?? 0) + 1);
      });
    });
    return Array.from(sessionCountByProduct.entries())
      .map(([productId, sessionCount]) => ({
        productId,
        sessionCount,
        totalQty: sessionQtyByProduct.get(productId) ?? 0,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount);
  }, [sessions]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  // A product whose details haven't loaded yet can't be matched to a
  // category, so it's left out while a category is selected (it appears as
  // soon as its lookup resolves).
  const inCategory = (productId: string) =>
    categoryFilter === "all" || (productsById[productId]?.categories.includes(categoryFilter) ?? false);

  const visibleMostWanted = mostWanted.filter((row) => inCategory(row.productId));
  // A cart is shown if any of its items is in the category; the cart keeps
  // its full contents (and true total), with out-of-category items faded.
  const visibleSessions = sortedSessions.filter((session) => session.items.some((item) => inCategory(item.productId)));
  // Cart numbers stay tied to the full, unfiltered list so "Cart #3" means
  // the same cart whether or not a category is selected.
  const cartNumber = new Map(sortedSessions.map((session, i) => [session.id, i + 1]));

  const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
    { value: "boys", label: t.products.sectionBoys },
    { value: "girls", label: t.products.sectionGirls },
    { value: "newborn", label: t.products.sectionNewborn },
    { value: "new-in", label: t.products.sectionNewIn },
    { value: "dresses", label: t.products.sectionDresses },
    { value: "winter", label: t.products.sectionWinter },
    { value: "shoes", label: t.products.sectionShoes },
    { value: "accessories", label: t.products.sectionAccessories },
    { value: "blankets", label: t.products.sectionBlankets },
    { value: "bath", label: t.products.sectionBath },
    { value: "gift-wrapping", label: t.products.sectionGiftWrapping },
    { value: "wholesale", label: t.products.sectionWholesale },
  ];

  const TABS: { value: Tab; label: string; count: number }[] = [
    { value: "mostWanted", label: t.pendingCarts.mostWantedTitle, count: visibleMostWanted.length },
    { value: "sessions", label: t.pendingCarts.sessionsTitle, count: visibleSessions.length },
  ];

  const sessionTotal = (session: CartSession) =>
    session.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-1">{t.pendingCarts.title}</h1>
      <p className="font-body-md text-on-surface-variant mb-lg">{t.pendingCarts.subtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
        <StatCard label={t.pendingCarts.sessionsTitle} value={sessions.length} icon="shopping_cart" tone="primary" />
        <StatCard label={t.pendingCarts.mostWantedTitle} value={mostWanted.length} icon="trending_up" tone="secondary" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-sm mb-md">
        <div
          role="tablist"
          aria-label={t.pendingCarts.title}
          className="flex w-full sm:w-auto p-1 rounded-full bg-surface-container-low border border-outline-variant/50"
        >
          {TABS.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`pending-tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`pending-panel-${value}`}
              onClick={() => setTab(value)}
              className={`flex-1 sm:flex-none px-md py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
                tab === value
                  ? "bg-primary-container/20 text-primary font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>
        <div className="sm:w-60">
          <label htmlFor="pending-category" className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            {t.pendingCarts.filterCategory}
          </label>
          <select
            id="pending-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface"
          >
            <option value="all">{t.pendingCarts.filterAllCategories}</option>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tab === "mostWanted" && (
        <div role="tabpanel" id="pending-panel-mostWanted" aria-labelledby="pending-tab-mostWanted">
          <div className="hidden md:block bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden overflow-x-auto mb-lg">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
                  <th className="py-3 px-md">{t.pendingCarts.mostWantedProduct}</th>
                  <th className="py-3 px-md text-end">{t.pendingCarts.mostWantedSessions}</th>
                  <th className="py-3 px-md text-end">{t.pendingCarts.mostWantedQty}</th>
                </tr>
              </thead>
              <tbody>
                {visibleMostWanted.map((row) => {
                  const product = productsById[row.productId];
                  const image = product?.colors[0]?.images[0]?.url;
                  return (
                    <tr key={row.productId} className="border-b border-outline-variant/50">
                      <td className="py-3 px-md">
                        {product ? (
                          <a
                            href={`/product/${row.productId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 hover:underline w-fit"
                          >
                            <div className="w-11 h-11 rounded-lg bg-surface-container overflow-hidden shrink-0">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={proxiedImageUrl(image)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[18px]">image_not_supported</span>
                                </div>
                              )}
                            </div>
                            <span className="font-body-md text-on-surface">{product.name[locale]}</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-surface-container overflow-hidden shrink-0 flex items-center justify-center text-on-surface-variant">
                              <span className="material-symbols-outlined text-[18px]">image_not_supported</span>
                            </div>
                            <span className="font-body-md text-on-surface-variant">
                              {product === null ? t.pendingCarts.productUnavailable : "…"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-md text-end font-body-md text-secondary font-bold">{row.sessionCount}</td>
                      <td className="py-3 px-md text-end font-body-md text-on-surface-variant">{row.totalQty}</td>
                    </tr>
                  );
                })}
                {visibleMostWanted.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-on-surface-variant font-body-md">
                      {categoryFilter === "all" ? t.pendingCarts.mostWantedEmpty : t.pendingCarts.noneInCategory}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col gap-sm mb-lg">
            {visibleMostWanted.map((row) => {
              const product = productsById[row.productId];
              const image = product?.colors[0]?.images[0]?.url;
              const thumb = (
                <div className="w-11 h-11 rounded-lg bg-surface-container overflow-hidden shrink-0">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxiedImageUrl(image)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">image_not_supported</span>
                    </div>
                  )}
                </div>
              );
              const info = (
                <div className="flex-1 min-w-0">
                  <p className={`font-body-md truncate ${product ? "text-on-surface" : "text-on-surface-variant"}`}>
                    {product ? product.name[locale] : product === null ? t.pendingCarts.productUnavailable : "…"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {t.pendingCarts.mostWantedSessions}: {row.sessionCount} · {t.pendingCarts.mostWantedQty}: {row.totalQty}
                  </p>
                </div>
              );
              return (
                <div key={row.productId} className="bg-surface-container-lowest rounded-2xl cloud-shadow p-md flex items-center gap-3">
                  {product ? (
                    <a
                      href={`/product/${row.productId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      {thumb}
                      {info}
                    </a>
                  ) : (
                    <>
                      {thumb}
                      {info}
                    </>
                  )}
                </div>
              );
            })}
            {visibleMostWanted.length === 0 && (
              <p className="py-8 text-center text-on-surface-variant font-body-md">
                {categoryFilter === "all" ? t.pendingCarts.mostWantedEmpty : t.pendingCarts.noneInCategory}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <div role="tabpanel" id="pending-panel-sessions" aria-labelledby="pending-tab-sessions" className="flex flex-col gap-sm">
          {visibleSessions.map((session) => (
            <div
              key={session.id}
              className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 p-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-md text-label-md text-primary">
                  {t.pendingCarts.cartLabel.replace("{n}", String(cartNumber.get(session.id)))}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t.pendingCarts.lastUpdated}: {formatRelativeTime(session.updatedAt, locale)}
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-outline-variant/50 pt-2">
                {session.items.map((item, idx) => {
                  const product = productsById[item.productId];
                  const image = product?.colors[0]?.images[0]?.url;
                  const thumb = (
                    <div className="w-11 h-11 rounded-lg bg-surface-container overflow-hidden shrink-0">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proxiedImageUrl(image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">image_not_supported</span>
                        </div>
                      )}
                    </div>
                  );
                  const info = (
                    <div className="flex-1 min-w-0">
                      <p className={`font-body-md truncate ${product ? "text-on-surface" : "text-on-surface-variant"}`}>
                        {product ? product.name[locale] : product === null ? t.pendingCarts.productUnavailable : "…"}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {t.pendingCarts.color}: {resolveColorLabel(product, item.color, locale)} · {t.pendingCarts.size}:{" "}
                        {item.size} · {t.pendingCarts.quantity}: {item.qty}
                      </p>
                    </div>
                  );
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-2 ${inCategory(item.productId) ? "" : "opacity-40"}`}
                    >
                      {product ? (
                        <a
                          href={`/product/${item.productId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 flex-1 min-w-0 hover:underline"
                        >
                          {thumb}
                          {info}
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {thumb}
                          {info}
                        </div>
                      )}
                      <span className="font-body-md text-on-surface shrink-0">{formatPrice(item.price * item.qty)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/50 font-headline-sm text-headline-sm">
                <span className="text-on-surface">{t.pendingCarts.cartTotal}</span>
                <span className="text-secondary">{formatPrice(sessionTotal(session))}</span>
              </div>
            </div>
          ))}
          {visibleSessions.length === 0 && (
            <p className="py-8 text-center text-on-surface-variant font-body-md">
              {categoryFilter === "all" ? t.pendingCarts.sessionsEmpty : t.pendingCarts.noneInCategory}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
