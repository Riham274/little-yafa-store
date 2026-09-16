"use client";

import { useRef, useState } from "react";
import type { ReactNode, TouchEvent, MouseEvent } from "react";
import CroppedThumbnail from "@/components/product/CroppedThumbnail";
import ImageLightbox from "@/components/product/ImageLightbox";
import { useLanguage } from "@/context/LanguageContext";
import type { ProductImage } from "@/lib/types";

const SWIPE_THRESHOLD = 40; // px of horizontal movement before it counts as a swipe
const TAP_MOVE_THRESHOLD = 10; // px of movement still small enough to count as a tap, not a swipe

export default function ImageGallery({
  images,
  alt,
  badge,
}: {
  images: ProductImage[];
  alt: string;
  badge?: ReactNode;
}) {
  const { dir } = useLanguage();
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const pics = images.length > 0 ? images : [null];

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const mouseStartX = useRef<number | null>(null);

  const goTo = (index: number) => setActive(Math.max(0, Math.min(pics.length - 1, index)));

  // In RTL, gallery order is visually mirrored (like the thumbnail row), so
  // the swipe that means "next" flips too — this keeps the gesture feeling
  // native instead of backwards for Arabic/Hebrew readers.
  const handleSwipe = (deltaX: number) => {
    if (pics.length <= 1 || Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    const isNext = dir === "rtl" ? deltaX > 0 : deltaX < 0;
    goTo(active + (isNext ? 1 : -1));
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    // Only treat it as a swipe if the motion was predominantly horizontal —
    // otherwise this was a vertical scroll and should be left alone.
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        handleSwipe(dx);
        return;
      }
    }
    // Small enough movement in every direction to have been a tap, not a
    // swipe or scroll — open the zoomed lightbox view.
    if (Math.abs(dx) < TAP_MOVE_THRESHOLD && Math.abs(dy) < TAP_MOVE_THRESHOLD) {
      setLightboxOpen(true);
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    mouseStartX.current = e.clientX;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    mouseStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      handleSwipe(dx);
      return;
    }
    setLightboxOpen(true);
  };

  return (
    <div>
      <div
        className="relative aspect-square rounded-[2rem] overflow-hidden cloud-shadow bg-surface-container-low mb-sm select-none cursor-zoom-in"
        style={{ touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => (mouseStartX.current = null)}
      >
        {pics[active] ? (
          <CroppedThumbnail
            src={(pics[active] as ProductImage).url}
            alt={alt}
            focalPoint={(pics[active] as ProductImage).focalPoint}
            preload
            // The 58vw share only holds up to the page's own max-width
            // (container-max: 1280px in tailwind.config.js) — past that,
            // the container itself stops growing, so a plain "58vw" would
            // keep requesting larger images than the gallery can ever
            // actually render on very wide screens. 720px approximates 58%
            // of the container's content width once its padding/column gap
            // are accounted for.
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 720px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl">image</span>
          </div>
        )}
        {badge}
      </div>
      {pics.length > 1 && (
        <div className="flex gap-sm">
          {pics.map((pic, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative aspect-square w-20 rounded-xl overflow-hidden border-2 transition-colors"
              style={{ borderColor: active === i ? "#5A5F44" : "transparent" }}
            >
              {pic && <CroppedThumbnail src={pic.url} alt="" focalPoint={pic.focalPoint} sizes="80px" />}
            </button>
          ))}
        </div>
      )}
      {lightboxOpen && (
        <ImageLightbox
          // The lightbox always shows the COMPLETE, uncropped image
          // (object-contain — see ImageLightbox.tsx) regardless of any
          // focal point, so it only ever needs the plain URL, never the
          // crop metadata.
          images={pics.map((p) => p?.url ?? null)}
          active={active}
          onNavigate={goTo}
          onClose={() => setLightboxOpen(false)}
          alt={alt}
          dir={dir}
        />
      )}
    </div>
  );
}
