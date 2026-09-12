"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem, Product } from "@/lib/types";
import { isProductOnSale } from "@/lib/sale";

const STORAGE_KEY = "little-yafa-cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, qty: number, color: string, size: string) => void;
  removeItem: (productId: string, color: string, size: string) => void;
  setQty: (productId: string, color: string, size: string, qty: number) => void;
  // Changes an existing line's color and/or size in place (used by the cart
  // page's inline color/size selectors). Re-derives price/image/stock from
  // `product` for the new combination — same source of truth addItem()
  // uses, so this can never drift from what the detail page would compute.
  // If the destination color+size already exists as a separate line, the
  // two are merged (quantities summed, capped to the destination's stock)
  // instead of leaving a duplicate row.
  updateItemVariant: (product: Product, oldColor: string, oldSize: string, newColor: string, newSize: string) => void;
  // Which product's line was just capped by updateItemVariant() due to
  // insufficient stock at the new combination, or null. Lives here (not as
  // local state in the cart row) because changing a row's color/size also
  // changes that row's React key (it's keyed by productId-color-size) —
  // the row unmounts/remounts in the very same update, which would destroy
  // any local "just capped" flag before it ever painted.
  cappedNoticeProductId: string | null;
  clear: () => void;
};

const CAPPED_NOTICE_MS = 4000;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cappedNoticeProductId, setCappedNoticeProductId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // `color` is always the Arabic label — see CartItem.color.
  const addItem = (product: Product, qty: number, color: string, size: string) => {
    const colorEntry = product.colors.find((c) => c.label.ar === color);
    const maxQty = colorEntry?.sizes.find((s) => s.label === size)?.stock ?? 0;
    const onSale = isProductOnSale(product);
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.color === color && item.size === size
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.color === color && item.size === size
            ? { ...item, qty: Math.min(item.qty + qty, maxQty), stock: maxQty }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: onSale ? product.salePrice : product.price,
          originalPrice: onSale ? product.price : undefined,
          image: colorEntry?.images[0] ?? null,
          color,
          colorLabel: colorEntry?.label ?? { ar: color, en: color, he: color },
          size,
          qty: Math.min(qty, maxQty),
          stock: maxQty,
        },
      ];
    });
  };

  const removeItem = (productId: string, color: string, size: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.color === color && item.size === size))
    );
  };

  const updateItemVariant = (
    product: Product,
    oldColor: string,
    oldSize: string,
    newColor: string,
    newSize: string
  ) => {
    if (oldColor === newColor && oldSize === newSize) return;

    const colorEntry = product.colors.find((c) => c.label.ar === newColor);
    const maxQty = colorEntry?.sizes.find((s) => s.label === newSize)?.stock ?? 0;
    const onSale = isProductOnSale(product);

    // Computed against the current `items` snapshot (not inside the
    // setItems updater below) — an updater can run more than once (React
    // dev-mode double-invocation) and must stay pure, so it's not a safe
    // place to also trigger this side effect.
    const currentOldItem = items.find(
      (item) => item.productId === product.id && item.color === oldColor && item.size === oldSize
    );
    if (currentOldItem) {
      const currentMergeTarget = items.find(
        (item) => item.productId === product.id && item.color === newColor && item.size === newSize
      );
      const desiredQty = (currentMergeTarget?.qty ?? 0) + currentOldItem.qty;
      if (desiredQty > maxQty) {
        setCappedNoticeProductId(product.id);
        setTimeout(() => {
          setCappedNoticeProductId((current) => (current === product.id ? null : current));
        }, CAPPED_NOTICE_MS);
      }
    }

    setItems((prev) => {
      const oldItem = prev.find(
        (item) => item.productId === product.id && item.color === oldColor && item.size === oldSize
      );
      if (!oldItem) return prev;

      const withoutOld = prev.filter(
        (item) => !(item.productId === product.id && item.color === oldColor && item.size === oldSize)
      );
      const mergeTarget = withoutOld.find(
        (item) => item.productId === product.id && item.color === newColor && item.size === newSize
      );

      if (mergeTarget) {
        return withoutOld.map((item) =>
          item === mergeTarget
            ? { ...item, qty: Math.min(item.qty + oldItem.qty, maxQty), stock: maxQty }
            : item
        );
      }

      return [
        ...withoutOld,
        {
          ...oldItem,
          price: onSale ? product.salePrice : product.price,
          originalPrice: onSale ? product.price : undefined,
          image: colorEntry?.images[0] ?? null,
          color: newColor,
          colorLabel: colorEntry?.label ?? { ar: newColor, en: newColor, he: newColor },
          size: newSize,
          qty: Math.min(oldItem.qty, maxQty),
          stock: maxQty,
        },
      ];
    });
  };

  const setQty = (productId: string, color: string, size: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.color === color && item.size === size
          ? { ...item, qty: Math.max(1, Math.min(qty, item.stock)) }
          : item
      )
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.qty * (item.price ?? 0), 0);

  return (
    <CartContext.Provider
      value={{ items, count, subtotal, addItem, removeItem, setQty, updateItemVariant, cappedNoticeProductId, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
