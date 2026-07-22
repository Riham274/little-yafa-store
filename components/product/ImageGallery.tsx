"use client";

import { useState } from "react";
import Image from "next/image";

export default function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const pics = images.length > 0 ? images : [null];

  return (
    <div>
      <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden cloud-shadow bg-surface-container-low mb-sm">
        {pics[active] ? (
          <Image src={pics[active] as string} alt={alt} fill priority className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl">image</span>
          </div>
        )}
      </div>
      {pics.length > 1 && (
        <div className="flex gap-sm">
          {pics.map((pic, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative aspect-square w-20 rounded-xl overflow-hidden border-2 transition-colors ${
                active === i ? "border-primary" : "border-transparent"
              }`}
            >
              {pic && <Image src={pic} alt="" fill className="object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
