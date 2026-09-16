import type { ImageFocalPoint } from "@/lib/types";

// Shared crop math for the focal-point/zoom feature — used by BOTH the
// admin's interactive picker (FocalPointPickerModal.tsx) and the storefront
// thumbnails (ProductCard.tsx/ImageGallery.tsx via CroppedThumbnail.tsx),
// so the two are guaranteed to render pixel-identical crops for the same
// {x, y, scale}.
//
// Deliberately expressed entirely in PERCENTAGES of the (always square)
// frame rather than fixed pixel constants — for a square frame, "how big
// is the cover-fit image as a % of the frame" depends only on the image's
// own aspect ratio, not the frame's actual rendered pixel size, so this
// needs no getBoundingClientRect()/ResizeObserver just to size the image.
//
// Why NOT "object-fit: cover + object-position, then a separate
// transform: scale() layered on top" (the previous, buggy approach): that
// composition crops the image down to the frame FIRST (object-fit's own
// sizing step, before any transform exists), so a transform applied
// afterward can only re-magnify what's left — it can never reveal content
// the crop step already discarded. That's why panning stopped responding
// once zoomed on an image where one dimension had zero base "cover" slack
// (width or height exactly matching the frame at scale 1): the bug wasn't
// a missing coefficient, it was that no coefficient inserted into the pan
// math could fix a rendering technique that structurally throws the
// content away before zoom ever sees it. Sizing the image explicitly (this
// file) avoids that entirely — nothing is ever cropped away before the pan
// position is applied.
export type CropBox = { widthPct: number; heightPct: number; leftPct: number; topPct: number };

/** The image's rendered size + position, as percentages of the square
 * frame, incorporating the current zoom (`focalPoint.scale`) directly into
 * the size — so the resulting slack (rendered size minus 100%) grows with
 * zoom, unlike the old object-position-based approach. */
export function getCropBox(focalPoint: ImageFocalPoint, naturalW: number, naturalH: number): CropBox {
  const aspect = naturalW / naturalH;
  let renderedWPct: number;
  let renderedHPct: number;
  if (aspect >= 1) {
    // Wider than tall (or square): height is the limiting "cover" dimension.
    renderedHPct = 100 * focalPoint.scale;
    renderedWPct = aspect * 100 * focalPoint.scale;
  } else {
    // Taller than wide: width is the limiting "cover" dimension.
    renderedWPct = 100 * focalPoint.scale;
    renderedHPct = (1 / aspect) * 100 * focalPoint.scale;
  }

  const slackXPct = renderedWPct - 100;
  const slackYPct = renderedHPct - 100;
  const leftPct = slackXPct > 0 ? -slackXPct * (focalPoint.x / 100) : (100 - renderedWPct) / 2;
  const topPct = slackYPct > 0 ? -slackYPct * (focalPoint.y / 100) : (100 - renderedHPct) / 2;

  return { widthPct: renderedWPct, heightPct: renderedHPct, leftPct, topPct };
}

/** Given a pointer position (as a % of the square frame, 0-100) and the x/y
 * the pan gesture started from (`basis` — held fixed for the whole gesture
 * by the caller), returns the new {x, y} that re-centers the crop on the
 * point under the pointer. `scale` is read live (it never changes during a
 * pan-only gesture, but isn't part of `basis` since zoom and pan are
 * otherwise fully independent). */
export function recenterFocalPoint(
  pointerXPct: number,
  pointerYPct: number,
  basis: { x: number; y: number },
  scale: number,
  naturalW: number,
  naturalH: number
): { x: number; y: number } {
  const { widthPct: renderedWPct, heightPct: renderedHPct } = getCropBox({ ...basis, scale }, naturalW, naturalH);
  const slackXPct = renderedWPct - 100;
  const slackYPct = renderedHPct - 100;

  const leftPctBasis = slackXPct > 0 ? -slackXPct * (basis.x / 100) : (100 - renderedWPct) / 2;
  const topPctBasis = slackYPct > 0 ? -slackYPct * (basis.y / 100) : (100 - renderedHPct) / 2;

  // The point on the (already fully-zoomed) rendered image under the
  // pointer, then choose a new offset that puts that exact point at the
  // frame's center (50%, 50%).
  const imagePctX = pointerXPct - leftPctBasis;
  const imagePctY = pointerYPct - topPctBasis;
  const newLeftPct = 50 - imagePctX;
  const newTopPct = 50 - imagePctY;

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const newX = slackXPct > 0 ? clamp((-newLeftPct / slackXPct) * 100, 0, 100) : basis.x;
  const newY = slackYPct > 0 ? clamp((-newTopPct / slackYPct) * 100, 0, 100) : basis.y;
  return { x: Math.round(newX), y: Math.round(newY) };
}
