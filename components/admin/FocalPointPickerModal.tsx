"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from "react";
import { DEFAULT_FOCAL_POINT, type ImageFocalPoint } from "@/lib/types";
import { getCropBox, recenterFocalPoint } from "@/lib/imageCrop";
import { useAdminLanguage } from "@/context/AdminLanguageContext";

// CSS px side length of the interactive square viewport below — purely a
// display size now (the crop math itself, in lib/imageCrop.ts, is
// percentage-based and doesn't depend on this value).
const VIEWPORT_SIZE = 220;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function touchDistance(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** The interactive square crop viewport. Renders the image at its true
 * (natural-aspect-ratio) size, scaled by the current zoom and positioned by
 * left/top — both as percentages of the frame (see lib/imageCrop.ts) — so
 * nothing is ever cropped away before zoom/pan gets applied to it. This is
 * the exact same technique CroppedThumbnail.tsx uses for the real
 * storefront thumbnails, so this viewport IS the live preview, not a
 * separate approximation of one.
 *
 * Pan (click/drag, or single-finger touch) re-centers the crop on the
 * point under the pointer, "grab the photo and move it" style (similar to
 * Instagram's cover-photo reposition tool) — and because the rendered size
 * itself grows with zoom, the reachable pan range grows with it too, all
 * the way to the image's true corners. Zoom (scroll wheel, or two-finger
 * pinch) only ever changes `scale`, independent of x/y. */
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
  // through the same, consistent linear conversion, rather than
  // compounding relative to a value that's itself changing every frame.
  const panBasis = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const recenterOnPoint = (clientX: number, clientY: number, basis: { x: number; y: number }) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || !naturalSize) return;

    const pointerXPct = ((clientX - rect.left) / rect.width) * 100;
    const pointerYPct = ((clientY - rect.top) / rect.height) * 100;
    const next = recenterFocalPoint(pointerXPct, pointerYPct, basis, focalPoint.scale, naturalSize.w, naturalSize.h);
    onChange({ ...focalPoint, x: next.x, y: next.y });
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
    // No e.preventDefault() here — React attaches wheel listeners as
    // passive, so calling it throws a console warning without actually
    // stopping the browser's default scroll (same reasoning as
    // ImageLightbox's own onWheel, which also skips it). The modal instead
    // locks document.body scroll entirely while it's open (see the effect
    // in FocalPointPickerModal below), the same way ImageLightbox does.
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

  const box = naturalSize ? getCropBox(focalPoint, naturalSize.w, naturalSize.h) : null;

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
      <div
        className="absolute"
        style={
          box
            ? { width: `${box.widthPct}%`, height: `${box.heightPct}%`, left: `${box.leftPct}%`, top: `${box.topPct}%` }
            : { width: "100%", height: "100%", left: 0, top: 0 }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="w-full h-full pointer-events-none"
        />
      </div>
      {/* Fixed center marker — the crop is always re-centered on the chosen
          point by construction, so the marker never needs to move. */}
      <div
        className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
        style={{ backgroundColor: "#5A5F44", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
      />
    </div>
  );
}

/** Same explicit-size crop technique as the pad above, at a smaller fixed
 * display size — used for both the modal's own live preview and can be
 * reused wherever a static (non-interactive) preview of a given crop is
 * needed. */
function CropPreview({ src, focalPoint, size }: { src: string; focalPoint: ImageFocalPoint; size: number }) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const box = naturalSize ? getCropBox(focalPoint, naturalSize.w, naturalSize.h) : null;

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-surface-container border border-outline-variant"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute"
        style={
          box
            ? { width: `${box.widthPct}%`, height: `${box.heightPct}%`, left: `${box.leftPct}%`, top: `${box.topPct}%` }
            : { width: "100%", height: "100%", left: 0, top: 0 }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="w-full h-full"
        />
      </div>
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

  // Locks background scroll while this full-screen modal is open — same
  // pattern as ImageLightbox.tsx. Without it, a scroll/wheel gesture meant
  // for zooming the pad (onWheel above) could also scroll the page behind
  // this overlay, since the wheel listener can't reliably preventDefault().
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
              <CropPreview src={src} focalPoint={focalPoint} size={64} />
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
