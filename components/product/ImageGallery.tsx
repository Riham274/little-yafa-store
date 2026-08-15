"use client";

import { useRef, useState } from "react";
import type { ReactNode, TouchEvent, MouseEvent } from "react";
import Image from "next/image";
import ImageWithSpinner from "@/components/ui/ImageWithSpinner";
import { useLanguage } from "@/context/LanguageContext";

const SWIPE_THRESHOLD = 40; // px of horizontal movement before it counts as a swipe

export default function ImageGallery({
  images,
  alt,
  badge,
}: {
  images: string[];
  alt: string;
  badge?: ReactNode;
}) {
  const { dir } = useLanguage();
  const [active, setActive] = useState(0);
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
    if (Math.abs(dx) > Math.abs(dy)) handleSwipe(dx);
  };

  const onMouseDown = (e: MouseEvent) => {
    mouseStartX.current = e.clientX;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (mouseStartX.current === null) return;
    handleSwipe(e.clientX - mouseStartX.current);
    mouseStartX.current = null;
  };

  return (
    <div>
      <div
        className="relative aspect-[4/5] rounded-[2rem] overflow-hidden cloud-shadow bg-surface-container-low mb-sm select-none"
        style={{ touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => (mouseStartX.current = null)}
      >
        {pics[active] ? (
          <ImageWithSpinner src={pics[active] as string} alt={alt} fill priority className="object-cover" />
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
              style={{ borderColor: active === i ? "#8C916F" : "transparent" }}
            >
              {pic && <Image src={pic} alt="" fill className="object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
