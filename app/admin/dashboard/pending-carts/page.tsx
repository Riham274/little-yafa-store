"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeToCartSessions, type CartSession } from "@/lib/firebase/cartSessions";
import { getProductByIdForAdmin } from "@/lib/firebase/products";
import { formatPrice } from "@/lib/format";
import { formatRelativeTime } from "@/lib/relativeTime";
import type { Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatCard from "@/components/admin/StatCard";
import { proxiedImageUrl } from "@/lib/imageProxy";

// undefined = still loading, null = deleted/not found — same convention as
// OrderDetailDrawer's ProductLookup.
type ProductLookup = Record<string, Product | null | undefined>;

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

      {/* Section A: Most wanted products */}
      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.pendingCarts.mostWantedTitle}</h2>

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
            {mostWanted.map((row) => {
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
            {mostWanted.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-on-surface-variant font-body-md">
                  {t.pendingCarts.mostWantedEmpty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-sm mb-lg">
        {mostWanted.map((row) => {
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
        {mostWanted.length === 0 && (
          <p className="py-8 text-center text-on-surface-variant font-body-md">{t.pendingCarts.mostWantedEmpty}</p>
        )}
      </div>

      {/* Section B: Individual cart sessions */}
      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">{t.pendingCarts.sessionsTitle}</h2>

      <div className="flex flex-col gap-sm">
        {sortedSessions.map((session, i) => (
          <div
            key={session.id}
            className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 p-md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md text-primary">
                {t.pendingCarts.cartLabel.replace("{n}", String(i + 1))}
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
                  <div key={idx} className="flex items-center justify-between gap-2">
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
        {sortedSessions.length === 0 && (
          <p className="py-8 text-center text-on-surface-variant font-body-md">{t.pendingCarts.sessionsEmpty}</p>
        )}
      </div>
    </div>
  );
}
