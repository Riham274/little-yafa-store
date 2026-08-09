"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "little-yafa-cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, qty: number, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

  const addItem = (product: Product, qty: number, size: string) => {
    const maxQty = product.sizes.find((s) => s.label === size)?.stock ?? 0;
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.size === size
            ? { ...item, qty: Math.min(item.qty + qty, maxQty), stock: maxQty }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.images[0] ?? null,
          size,
          qty: Math.min(qty, maxQty),
          stock: maxQty,
        },
      ];
    });
  };

  const removeItem = (productId: string, size: string) => {
    setItems((prev) => prev.filter((item) => !(item.productId === productId && item.size === size)));
  };

  const setQty = (productId: string, size: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.size === size
          ? { ...item, qty: Math.max(1, Math.min(qty, item.stock)) }
          : item
      )
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, addItem, removeItem, setQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
