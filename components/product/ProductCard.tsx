"use client";

import Link from "next/link";
import ImageWithSpinner from "@/components/ui/ImageWithSpinner";
import { useLanguage } from "@/context/LanguageContext";
import { formatPrice } from "@/lib/format";
import { getTotalStock } from "@/lib/firebase/products";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  const { locale, t } = useLanguage();
  const outOfStock = getTotalStock(product) <= 0;
  const image = product.images[0];

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group flex flex-col gap-sm ${outOfStock ? "opacity-50" : ""}`}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-container-low cloud-shadow">
        {image ? (
          <ImageWithSpinner
            src={image}
            alt={product.name[locale]}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl">image</span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute top-2 left-2">
            <span className="bg-on-surface/80 text-inverse-on-surface text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {t.product.outOfStock}
            </span>
          </div>
        )}
      </div>
      <div>
        <h3 className="font-label-md text-label-md text-on-surface line-clamp-1">{product.name[locale]}</h3>
        {product.price !== undefined && (
          <span className="font-label-sm text-label-sm" style={{ color: "#8C916F" }}>
            {formatPrice(product.price)}
          </span>
        )}
      </div>
    </Link>
  );
}
