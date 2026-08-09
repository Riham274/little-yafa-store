"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export default function CartItemRow({ item }: { item: CartItem }) {
  const { locale, t } = useLanguage();
  const { setQty, removeItem } = useCart();

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] p-base md:p-md cloud-shadow flex gap-md items-center">
      <div className="relative w-24 h-24 md:w-40 md:h-40 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
        {item.image ? (
          <Image src={item.image} alt={item.name[locale]} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">image</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{item.name[locale]}</h3>
          <p className="font-body-md text-body-md text-secondary font-semibold whitespace-nowrap">
            {formatPrice(item.price * item.qty)}
          </p>
        </div>
        <p className="font-body-md text-[14px] text-on-surface-variant mt-1">{formatPrice(item.price)} / {t.product.quantity.toLowerCase()}</p>
        <p className="font-body-md text-[14px] text-on-surface-variant mt-0.5">
          {t.product.size}: <span className="text-on-surface">{item.size}</span>
        </p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 bg-surface-container rounded-full px-2 py-1">
            <button
              onClick={() => setQty(item.productId, item.size, item.qty - 1)}
              disabled={item.qty <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <span className="font-label-md text-label-md w-6 text-center">{item.qty}</span>
            <button
              onClick={() => setQty(item.productId, item.size, item.qty + 1)}
              disabled={item.qty >= item.stock}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          <button
            onClick={() => removeItem(item.productId, item.size)}
            className="p-2 -m-2 rounded-full text-on-surface-variant hover:text-error transition-colors"
            title={t.cart.remove}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
