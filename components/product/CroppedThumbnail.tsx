"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";
import { getCropBox } from "@/lib/imageCrop";
import type { ImageFocalPoint } from "@/lib/types";
import ImageWithSpinner from "@/components/ui/ImageWithSpinner";

// Renders a product image cropped to its focal point + zoom, filling
// whatever `relative`-positioned frame it's placed inside (matches how a
// plain `<ImageWithSpinner fill>` was used before this component existed).
// Uses the exact same explicit-size/position technique as the admin's
// FocalPointPickerModal (see lib/imageCrop.ts) — not object-fit/object-
// position + a layered transform:scale, which can't correctly reveal
// zoomed-in content once object-fit has already cropped it away. Because
// both places share the same crop math, the admin's live preview and the
// real storefront thumbnail are guaranteed to render identically for the
// same {x, y, scale}.
export default function CroppedThumbnail({
  src,
  alt,
  focalPoint,
  sizes,
  preload,
  className = "",
  wrapperClassName = "",
}: {
  src: string;
  alt: string;
  focalPoint: ImageFocalPoint;
  sizes: string;
  preload?: boolean;
  // Applied to the <img> itself (e.g. extra filters) — rarely needed since
  // object-fit no longer does any cropping here.
  className?: string;
  // Applied to the correctly-sized/positioned inner wrapper — this is
  // where a transient hover effect (e.g. group-hover:scale-105) belongs,
  // since it's layered on top of (not part of) the saved crop.
  wrapperClassName?: string;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const box = naturalSize ? getCropBox(focalPoint, naturalSize.w, naturalSize.h) : null;

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={`absolute ${wrapperClassName}`}
        style={
          box
            ? { width: `${box.widthPct}%`, height: `${box.heightPct}%`, left: `${box.leftPct}%`, top: `${box.topPct}%` }
            : { width: "100%", height: "100%", left: 0, top: 0 }
        }
      >
        <ImageWithSpinner
          src={src}
          alt={alt}
          fill
          preload={preload}
          sizes={sizes}
          className={`object-cover ${className}`}
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
