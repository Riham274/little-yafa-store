"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent, MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 40;
const TAP_MOVE_THRESHOLD = 5;

function touchDistance(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function clampScale(s: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

/**
 * Full-screen zoomable lightbox: pinch-to-zoom + drag-to-pan on touch,
 * scroll-to-zoom + click-to-zoom + drag-to-pan on desktop. Swiping between
 * images (mirroring the main gallery's own gesture) only fires while the
 * image isn't zoomed in, so a pan gesture at scale > 1 never accidentally
 * changes the picture.
 */
export default function ImageLightbox({
  images,
  active,
  onNavigate,
  onClose,
  alt,
  dir,
}: {
  images: (string | null)[];
  active: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  alt: string;
  dir: "ltr" | "rtl";
}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);

  // A freshly-navigated-to image always starts flat, not still zoomed/panned
  // from whatever the previous image was left at.
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [active]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goTo(active + (dir === "rtl" ? 1 : -1));
      if (e.key === "ArrowRight") goTo(active + (dir === "rtl" ? -1 : 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, active, dir]);

  // Background scroll must stay locked while the lightbox is open, and a
  // native (non-passive) touchmove listener is required to actually stop
  // the browser's own pinch-zoom/scroll during a gesture — React attaches
  // touch listeners as passive by default, so calling preventDefault()
  // from the JSX onTouchMove handler below is silently ignored.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = containerRef.current;
    const preventNativeGesture = (e: TouchEvent) => {
      if (pinchStart.current || panStart.current) e.preventDefault();
    };
    el?.addEventListener("touchmove", preventNativeGesture, { passive: false });
    return () => {
      document.body.style.overflow = previousOverflow;
      el?.removeEventListener("touchmove", preventNativeGesture);
    };
  }, []);

  const goTo = (index: number) => onNavigate(Math.max(0, Math.min(images.length - 1, index)));

  // Same left/right-in-RTL flip as the main gallery's swipe handling.
  const handleSwipe = (deltaX: number) => {
    if (images.length <= 1) return;
    const isNext = dir === "rtl" ? deltaX > 0 : deltaX < 0;
    goTo(active + (isNext ? 1 : -1));
  };

  const clampTranslate = (t: { x: number; y: number }, s: number) => {
    // Rough bound so a pan can't fling the image entirely off-screen —
    // proportional to zoom level, not a pixel-perfect edge calculation.
    const max = 160 * (s - 1);
    return { x: Math.max(-max, Math.min(max, t.x)), y: Math.max(-max, Math.min(max, t.y)) };
  };

  const toggleZoom = () => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const onWheel = (e: ReactWheelEvent) => {
    const next = clampScale(scale - e.deltaY * 0.0025);
    setScale(next);
    if (next === 1) setTranslate({ x: 0, y: 0 });
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    wasDragged.current = false;
    if (scale > 1) {
      panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    } else {
      swipeStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onMouseMove = (e: ReactMouseEvent) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) wasDragged.current = true;
    setTranslate(clampTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy }, scale));
  };

  const endMouseGesture = (clientX: number) => {
    if (panStart.current) {
      panStart.current = null;
      // A mousedown+mouseup with no real movement while zoomed in is a
      // click, not a pan — fall through to the same toggleZoom() a click
      // at scale 1 gets, so clicking a zoomed-in image zooms back out.
      if (!wasDragged.current) toggleZoom();
      return;
    }
    if (swipeStart.current) {
      const dx = clientX - swipeStart.current.x;
      swipeStart.current = null;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        handleSwipe(dx);
        return;
      }
    }
    if (!wasDragged.current) toggleZoom();
  };

  const onMouseUp = (e: ReactMouseEvent) => endMouseGesture(e.clientX);
  const onMouseLeave = () => {
    panStart.current = null;
    swipeStart.current = null;
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDistance(e.touches[0], e.touches[1]), scale };
      swipeStart.current = null;
      panStart.current = null;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      if (scale > 1) {
        panStart.current = { x: t.clientX, y: t.clientY, tx: translate.x, ty: translate.y };
      } else {
        swipeStart.current = { x: t.clientX, y: t.clientY };
      }
    }
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const next = clampScale(pinchStart.current.scale * (dist / pinchStart.current.dist));
      setScale(next);
      if (next === 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && panStart.current) {
      const t = e.touches[0];
      setTranslate(
        clampTranslate(
          { x: panStart.current.tx + (t.clientX - panStart.current.x), y: panStart.current.ty + (t.clientY - panStart.current.y) },
          scale
        )
      );
    }
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (e.touches.length > 0) return; // a finger is still down (e.g. pinch collapsing to one touch)
    pinchStart.current = null;
    if (panStart.current) {
      panStart.current = null;
      return;
    }
    if (swipeStart.current) {
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeStart.current.x;
      const dy = t.clientY - swipeStart.current.y;
      swipeStart.current = null;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= SWIPE_THRESHOLD) handleSwipe(dx);
    }
  };

  const src = images[active];
  const isGesturing = Boolean(pinchStart.current || panStart.current);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center overflow-hidden" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 end-4 z-10 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(active - 1);
            }}
            aria-label="Previous"
            disabled={active === 0}
            className="hidden sm:flex absolute start-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/40 text-white items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-3xl">chevron_left</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(active + 1);
            }}
            aria-label="Next"
            disabled={active === images.length - 1}
            className="hidden sm:flex absolute end-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/40 text-white items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-3xl">chevron_right</span>
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className="relative w-full h-full max-w-5xl max-h-[85vh] mx-auto"
        style={{ touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {src && (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            className="object-contain select-none"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: isGesturing ? "none" : "transform 0.15s ease-out",
              cursor: scale > 1 ? "grab" : "zoom-in",
            }}
            draggable={false}
          />
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i === active ? "#fff" : "rgba(255,255,255,0.4)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
