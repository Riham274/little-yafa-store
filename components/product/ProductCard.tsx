"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { getAvailableSizeLabels, getTotalStock } from "@/lib/firebase/products";
import type { Product } from "@/lib/types";
import CroppedThumbnail from "./CroppedThumbnail";
import PriceTag from "./PriceTag";
import ProductStatusBadge from "./ProductStatusBadge";

export default function ProductCard({
  product,
  // Set by ProductGrid for the first handful of cards (above the fold in
  // its 2/4-column grid) so the LCP candidate — almost always the first
  // product image on a category page — is discovered and requested by the
  // browser immediately instead of waiting on lazy-load's intersection
  // check. Every other card leaves this off and keeps its existing
  // lazy-loaded behavior.
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { locale } = useLanguage();
  const outOfStock = getTotalStock(product) <= 0;
  const image = product.colors[0]?.images[0];
  const sizeLabels = getAvailableSizeLabels(product);

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group flex flex-col gap-sm ${outOfStock ? "opacity-50" : ""}`}
    >
      {/* Explicit aspect-ratio alongside the aspect-square utility — belt
          and suspenders so this frame's height is reserved from the very
          first paint (before any image, priority-loaded or not, has
          finished loading), so eager-loading the first row's images can
          never cause the rest of the grid/page to shift as they pop in. */}
      <div
        className="relative aspect-square rounded-xl overflow-hidden bg-surface-container-low cloud-shadow"
        style={{ aspectRatio: "1 / 1" }}
      >
        {image ? (
          <CroppedThumbnail
            src={image.url}
            alt={product.name[locale]}
            focalPoint={image.focalPoint}
            sizes="(max-width: 768px) 50vw, 25vw"
            priority={priority}
            // The hover-zoom effect is layered on top of the already-
            // correctly-cropped wrapper — it's a transient visual nicety,
            // not part of the saved crop, so a plain transform class here
            // is fine (nothing for it to conflict with, unlike the old
            // object-position + transform:scale technique).
            wrapperClassName="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl">image</span>
          </div>
        )}
        <ProductStatusBadge product={product} />
      </div>
      <div>
        <h3 className="font-label-md text-label-md text-on-surface line-clamp-1">{product.name[locale]}</h3>
        {product.price !== undefined && (
          <PriceTag
            price={product.price}
            salePrice={product.salePrice}
            priceClassName="font-label-sm text-label-sm"
            priceStyle={{ color: "#5A5F44" }}
          />
        )}
        {sizeLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {sizeLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 font-label-sm text-[10px] text-on-surface-variant"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
