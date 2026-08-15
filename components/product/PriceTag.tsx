import type { CSSProperties } from "react";
import { formatPrice } from "@/lib/format";
import { getDiscountPercent } from "@/lib/sale";

// Renders a plain price, or — when `salePrice` is lower than `price` — the
// original price struck through in red, the sale price (styled the same as
// the plain-price case via priceClassName/priceStyle so every call site
// keeps its existing price typography), and a small discount badge.
export default function PriceTag({
  price,
  salePrice,
  priceClassName = "",
  priceStyle,
}: {
  price: number;
  salePrice?: number;
  priceClassName?: string;
  priceStyle?: CSSProperties;
}) {
  const onSale = salePrice !== undefined && salePrice < price;

  if (!onSale) {
    return (
      <span className={priceClassName} style={priceStyle}>
        {formatPrice(price)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span className="line-through text-error font-normal">{formatPrice(price)}</span>
      <span className={priceClassName} style={priceStyle}>
        {formatPrice(salePrice)}
      </span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-error text-on-error leading-none">
        -{getDiscountPercent(price, salePrice)}%
      </span>
    </span>
  );
}
