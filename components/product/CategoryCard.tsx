import Link from "next/link";
import Image from "next/image";
import { proxiedImageUrl } from "@/lib/imageProxy";

// Icon source files aren't guaranteed to share the same intrinsic aspect
// ratio (e.g. icon-sale-olive.png is a tall 304x597 tag glyph vs. the square
// ~280x280 garment icons), which previously threw off the card's computed
// size when width/height props were used. Rendering into a fixed square box
// with `fill` + `object-contain` keeps every card the same size regardless
// of the source image's own dimensions.
//
// Shared between the homepage's category grid and the Newborn intermediate
// sub-category page (Cotton/Muslin vs Wool/Winter) — same arched-card look
// wherever a customer picks between a small set of top-level options.
export default function CategoryCard({
  href,
  label,
  icon,
  labelColor = "#5A5F44",
  sizes = "120px",
  gapClassName = "gap-0.5 sm:gap-1",
}: {
  href: string;
  label: string;
  icon: string;
  labelColor?: string;
  // Matches whatever fraction of the viewport this card actually renders
  // at — the homepage's 4-per-row grid vs. e.g. a 2-per-row sub-category
  // picker are meaningfully different rendered widths.
  sizes?: string;
  // The default gap only ever had to hold up against the homepage's short,
  // single-line labels (e.g. "أولاد"). A caller with longer, wrapping
  // labels (the Newborn sub-category cards) can pass a roomier value
  // instead — kept opt-in so the homepage's own cards render byte-for-byte
  // unchanged.
  gapClassName?: string;
}) {
  return (
    <Link href={href} className="group flex flex-col items-center">
      <div
        className={`w-full aspect-[1/1.3] rounded-t-full bg-[#EFE5DC] cloud-shadow flex flex-col items-center justify-center ${gapClassName} px-1 pb-0.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg`}
      >
        <div className="relative w-[84%] aspect-square">
          <Image src={proxiedImageUrl(icon)} alt={label} fill sizes={sizes} className="object-contain" />
        </div>
        <span
          className="font-headline-sm text-[11px] sm:text-[13px] md:text-[15px] leading-tight text-center px-1"
          style={{ color: labelColor, fontWeight: 500 }}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
