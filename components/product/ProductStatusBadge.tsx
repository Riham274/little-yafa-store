"use client";

import { useLanguage } from "@/context/LanguageContext";
import { isProductOutOfStock } from "@/lib/firebase/products";
import { isProductNew } from "@/lib/productStatus";
import type { Product } from "@/lib/types";

// Out-of-stock takes priority — no point advertising "New" on something
// that can't actually be bought.
export default function ProductStatusBadge({ product }: { product: Product }) {
  const { t } = useLanguage();
  const outOfStock = isProductOutOfStock(product);
  const isNew = !outOfStock && isProductNew(product);

  if (!outOfStock && !isNew) return null;

  return (
    <div className="absolute top-2 left-2 z-10">
      <span
        className={`text-[10px] px-2 py-1 rounded-md font-bold ${
          outOfStock ? "bg-error text-on-error" : "bg-[#2e7d4f] text-white"
        }`}
      >
        {outOfStock ? t.product.outOfStock : t.product.new}
      </span>
    </div>
  );
}
