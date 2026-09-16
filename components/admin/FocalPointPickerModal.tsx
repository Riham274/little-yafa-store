"use client";

import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from "react";
import { DEFAULT_FOCAL_POINT, type ImageFocalPoint } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";

// Fixed CSS px side length of the interactive square viewport below — kept
// as a constant (rather than measured via getBoundingClientRect) so the
// cover-scale math is simple and exact, matching the box's actual Tailwind
// size (w-55/h-55 = 220px at the default root font size).
const VIEWPORT_SIZE = 220;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function touchDistance(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** The interactive square crop viewport: renders the photo with the exact
 * same technique the real storefront thumbnail uses — object-fit: cover +
 * object-position: x% y% for the base crop, then a CSS transform: scale()
 * layered on top (anchored at the viewport's center) for zoom — so this
 * viewport IS the live preview, not a separate approximation of one.
 *
 * Pan (click/drag, or single-finger touch) re-centers the base crop on the
 * point under the pointer, "grab the photo and move it" style (similar to
 * Instagram's cover-photo reposition tool). Zoom (scroll wheel, or two-
 * finger pinch) only ever changes `scale`, independent of x/y — because the
 * scale transform is anchored at the viewport's center, changing it alone
 * can't shift what's centered, it only magnifies/shrinks around it. That
 * decoupling is what keeps the pan math below unchanged from a plain
 * (unzoomed) picker: a pan gesture's screen coordinates just need to be
 * un-zoomed first (divided by the current scale, relative to the
 * viewport's center) before feeding into the same base-crop recentering
 * formula. */
function FocalPointPad({
  src,
  focalPoint,
  onChange,
}: {
  src: string;
  focalPoint: ImageFocalPoint;
  onChange: (fp: ImageFocalPoint) => void;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  // The x/y as they were when the current pan gesture started — kept fixed
  // for the whole gesture so every pointer position during the drag maps
  // through the same, consistent linear conversion (see recenterOnPoint
  // below), rather than compounding relative to a value that's itself
  // changing every frame.
  const panBasis = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const recenterOnPoint = (clientX: number, clientY: number, basis: { x: number; y: number }) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || !naturalSize) return;

    // Undo the zoom transform (anchored at the viewport's center) to find
    // where this screen point falls in the unzoomed base-crop view.
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const baseViewX = VIEWPORT_SIZE / 2 + (rawX - VIEWPORT_SIZE / 2) / focalPoint.scale;
    const baseViewY = VIEWPORT_SIZE / 2 + (rawY - VIEWPORT_SIZE / 2) / focalPoint.scale;

    const coverScale = Math.max(VIEWPORT_SIZE / naturalSize.w, VIEWPORT_SIZE / naturalSize.h);
    const renderedW = naturalSize.w * coverScale;
    const renderedH = naturalSize.h * coverScale;
    const slackX = renderedW - VIEWPORT_SIZE;
    const slackY = renderedH - VIEWPORT_SIZE;

    // Where the basis x/y places the image's rendered top-left corner
    // relative to the viewport, per CSS object-position's own percentage
    // semantics (0% = image's edge flush with viewport's edge on that
    // side, 100% = flush on the opposite side).
    const offsetXBasis = slackX > 0 ? -slackX * (basis.x / 100) : 0;
    const offsetYBasis = slackY > 0 ? -slackY * (basis.y / 100) : 0;

    // The point in the rendered (base-crop) image under the pointer, then
    // choose a new offset that puts that exact point at the viewport's
    // center.
    const imagePxX = baseViewX - offsetXBasis;
    const imagePxY = baseViewY - offsetYBasis;
    const newOffsetX = VIEWPORT_SIZE / 2 - imagePxX;
    const newOffsetY = VIEWPORT_SIZE / 2 - imagePxY;

    const newX = slackX > 0 ? clamp((-newOffsetX / slackX) * 100, 0, 100) : basis.x;
    const newY = slackY > 0 ? clamp((-newOffsetY / slackY) * 100, 0, 100) : basis.y;
    onChange({ ...focalPoint, x: Math.round(newX), y: Math.round(newY) });
  };

  const startPan = (clientX: number, clientY: number) => {
    panBasis.current = { x: focalPoint.x, y: focalPoint.y };
    recenterOnPoint(clientX, clientY, panBasis.current);
  };
  const continuePan = (clientX: number, clientY: number) => {
    if (!panBasis.current) return;
    recenterOnPoint(clientX, clientY, panBasis.current);
  };
  const endPan = () => {
    panBasis.current = null;
  };

  const onMouseDown = (e: ReactMouseEvent) => startPan(e.clientX, e.clientY);
  const onMouseMove = (e: ReactMouseEvent) => continuePan(e.clientX, e.clientY);

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault();
    const next = clamp(focalPoint.scale - e.deltaY * 0.0025, MIN_SCALE, MAX_SCALE);
    onChange({ ...focalPoint, scale: next });
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDistance(e.touches[0], e.touches[1]), scale: focalPoint.scale };
      panBasis.current = null;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      startPan(t.clientX, t.clientY);
    }
  };
  const onTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const next = clamp(pinchStart.current.scale * (dist / pinchStart.current.dist), MIN_SCALE, MAX_SCALE);
      onChange({ ...focalPoint, scale: next });
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      continuePan(t.clientX, t.clientY);
    }
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    if (e.touches.length === 0) {
      pinchStart.current = null;
      endPan();
    }
  };

  return (
    <div
      ref={viewportRef}
      className="relative rounded-lg overflow-hidden bg-surface-container cursor-crosshair select-none touch-none"
      style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endPan}
      onMouseLeave={endPan}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        className="w-full h-full object-cover pointer-events-none"
        style={{
          objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
          transform: `scale(${focalPoint.scale})`,
          transformOrigin: "center",
        }}
      />
      {/* Fixed center marker — the crop is always re-centered on the chosen
          point by construction, so the marker never needs to move. */}
      <div
        className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
        style={{ backgroundColor: "#5A5F44", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
      />
    </div>
  );
}

export default function FocalPointPickerModal({
  src,
  focalPoint,
  onChange,
  onClose,
  onConfirm,
}: {
  src: string;
  focalPoint: ImageFocalPoint;
  onChange: (fp: ImageFocalPoint) => void;
  // Optional/re-editable mode (an already-added image): shows a close (X)
  // button and allows dismissing via the backdrop, since adjusting an
  // existing image's crop is never mandatory.
  onClose?: () => void;
  // Mandatory mode (a newly selected file, not yet added to the product):
  // no close/backdrop-dismiss — the admin must press this to confirm the
  // crop and add the image, per the "every image goes through this step
  // once" requirement.
  onConfirm?: () => void;
}) {
  const { t, dir } = useAdminLanguage();
  const dismissible = Boolean(onClose);

  const handleBackdropClick = () => {
    if (dismissible) onClose?.();
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-gutter"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-surface rounded-[2rem] cloud-shadow w-full max-w-sm p-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">{t.products.focalPointTitle}</h3>
          {dismissible && (
            <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
          {dismissible ? t.products.focalPointHint : t.products.focalPointHintRequired}
        </p>

        <div className="flex items-end gap-md flex-wrap">
          <FocalPointPad src={src} focalPoint={focalPoint} onChange={onChange} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t.products.focalPointPreviewLabel}
              </span>
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-container border border-outline-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                    transform: `scale(${focalPoint.scale})`,
                    transformOrigin: "center",
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FOCAL_POINT)}
              className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              {t.products.focalPointReset}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirm ?? onClose}
          className="mt-lg w-full px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow hover:shadow-md transition-all active:scale-95"
        >
          {onConfirm ? t.products.focalPointConfirmAdd : t.products.focalPointDone}
        </button>
      </div>
    </div>
  );
}
