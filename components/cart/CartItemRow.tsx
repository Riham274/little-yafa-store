"use client";

import Link from "next/link";
import ImageWithSpinner from "@/components/ui/ImageWithSpinner";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { getColorLabel } from "@/lib/colorLabel";
import type { CartItem, Product } from "@/lib/types";
import PriceTag from "@/components/product/PriceTag";

export default function CartItemRow({
  item,
  product,
}: {
  item: CartItem;
  // undefined = still loading, null = deleted/hidden since it was added —
  // both fall back to the plain (non-editable) color/size text below,
  // same as a product that's been removed from the catalog.
  product: Product | null | undefined;
}) {
  const { locale, t } = useLanguage();
  const { setQty, removeItem, updateItemVariant, cappedNoticeProductId } = useCart();

  // Product page link carries the exact color/size the customer already
  // has selected in the cart, so arriving there shows that variant instead
  // of resetting to the default first color/size.
  const productHref = `/product/${item.productId}?color=${encodeURIComponent(item.color)}&size=${encodeURIComponent(item.size)}`;

  // Only colors with at least one in-stock size are offered — a color
  // that's entirely sold out isn't a real option to switch to.
  const colorOptions = product?.colors.filter((c) => c.sizes.some((s) => s.stock > 0)) ?? [];
  const liveColor = product?.colors.find((c) => c.label.ar === item.color);
  const sizeOptions = liveColor?.sizes.filter((s) => s.stock > 0) ?? [];
  const canEditVariant = colorOptions.length > 0 && sizeOptions.length > 0;

  const handleColorChange = (newColorAr: string) => {
    if (!product) return;
    const newColorEntry = product.colors.find((c) => c.label.ar === newColorAr);
    const newSizeOptions = newColorEntry?.sizes.filter((s) => s.stock > 0) ?? [];
    // Keep the same size across the color swap when it's still available,
    // rather than forcing the customer to re-pick a size they already chose.
    const newSize = newSizeOptions.some((s) => s.label === item.size)
      ? item.size
      : (newSizeOptions[0]?.label ?? item.size);
    updateItemVariant(product, item.color, item.size, newColorAr, newSize);
  };

  const handleSizeChange = (newSize: string) => {
    if (!product) return;
    updateItemVariant(product, item.color, item.size, item.color, newSize);
  };

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] p-base md:p-md cloud-shadow flex gap-md items-center">
      <Link href={productHref} className="relative w-24 h-24 md:w-40 md:h-40 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
        {item.image ? (
          <ImageWithSpinner
            src={item.image}
            alt={item.name[locale]}
            fill
            sizes="(max-width: 768px) 96px, 160px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">image</span>
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={productHref} className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1 hover:underline">
              {item.name[locale]}
            </h3>
          </Link>
          {item.price !== undefined && (
            <p className="font-body-md text-body-md text-secondary font-semibold whitespace-nowrap">
              {formatPrice(item.price * item.qty)}
            </p>
          )}
        </div>
        {item.price !== undefined && (
          <p className="font-body-md text-[14px] text-on-surface-variant mt-1 flex items-center gap-1 flex-wrap">
            <PriceTag
              price={item.originalPrice ?? item.price}
              salePrice={item.originalPrice !== undefined ? item.price : undefined}
              priceClassName="text-on-surface-variant"
            />
            <span>/ {t.product.quantity.toLowerCase()}</span>
          </p>
        )}

        {canEditVariant ? (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Native <select> arrows don't reliably mirror to the correct
                edge under dir="rtl" across browsers, and there's no room
                reserved for one in this compact size — which is what made
                it look like it was floating mid-text. `appearance-none`
                strips the native arrow entirely and this custom one is
                positioned at the logical `start` side (right edge in RTL,
                left edge in LTR) so it mirrors automatically.
                The positioning span is kept separate from the icon glyph
                span on purpose: .material-symbols-outlined globally forces
                `direction: ltr` (elsewhere needed so icon ligature text
                like "close" doesn't get bidi-reversed), and a logical
                `start-*`/`end-*` offset resolves against an element's OWN
                direction — putting it on the icon span itself would always
                resolve to the same physical side regardless of page dir,
                exactly the bug this is fixing. Putting `start-1` on this
                plain outer span instead lets it correctly inherit the
                page's real direction. */}
            <div className="relative">
              <select
                value={item.color}
                onChange={(e) => handleColorChange(e.target.value)}
                aria-label={t.product.color}
                className="appearance-none bg-none bg-surface-container rounded-lg border border-outline-variant ps-8 pe-2 py-1 font-body-md text-[13px] text-on-surface"
              >
                {/* The currently-selected color might not be in colorOptions
                    if it just sold out — keep it selectable so the <select>
                    doesn't silently jump to a different color. */}
                {!colorOptions.some((c) => c.label.ar === item.color) && liveColor && (
                  <option value={liveColor.label.ar}>{liveColor.label[locale] || liveColor.label.ar}</option>
                )}
                {colorOptions.map((c) => (
                  <option key={c.label.ar} value={c.label.ar}>
                    {c.label[locale] || c.label.ar}
                  </option>
                ))}
              </select>
              <span className="absolute start-1 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
              </span>
            </div>
            <div className="relative">
              <select
                value={item.size}
                onChange={(e) => handleSizeChange(e.target.value)}
                aria-label={t.product.size}
                className="appearance-none bg-none bg-surface-container rounded-lg border border-outline-variant ps-8 pe-2 py-1 font-body-md text-[13px] text-on-surface"
              >
                {!sizeOptions.some((s) => s.label === item.size) && (
                  <option value={item.size}>{item.size}</option>
                )}
                {sizeOptions.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="absolute start-1 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
              </span>
            </div>
          </div>
        ) : (
          <>
            <p className="font-body-md text-[14px] text-on-surface-variant mt-0.5">
              {t.product.color}: <span className="text-on-surface">{getColorLabel(item, locale)}</span>
            </p>
            <p className="font-body-md text-[14px] text-on-surface-variant mt-0.5">
              {t.product.size}: <span className="text-on-surface">{item.size}</span>
            </p>
          </>
        )}
        {cappedNoticeProductId === item.productId && (
          <p className="font-label-sm text-label-sm text-error mt-1">{t.cart.qtyAdjustedNote}</p>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 bg-surface-container rounded-full px-2 py-1">
            <button
              onClick={() => setQty(item.productId, item.color, item.size, item.qty - 1)}
              disabled={item.qty <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <span className="font-label-md text-label-md w-6 text-center">{item.qty}</span>
            <button
              onClick={() => setQty(item.productId, item.color, item.size, item.qty + 1)}
              disabled={item.qty >= item.stock}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          <button
            onClick={() => removeItem(item.productId, item.color, item.size)}
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
