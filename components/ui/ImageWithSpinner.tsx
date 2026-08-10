"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import Spinner from "./Spinner";

// Drop-in replacement for a `fill` next/image inside a `relative` container:
// shows the shared spinner over the container until the image finishes
// loading, then fades it in. Loaded state is keyed by src so switching back
// to an already-loaded image (e.g. gallery thumbnails, revisited pages)
// doesn't re-flash the spinner.
export default function ImageWithSpinner({ className = "", onLoad, ...props }: ImageProps) {
  const [loadedSrcs, setLoadedSrcs] = useState<Record<string, boolean>>({});
  const srcKey = typeof props.src === "string" ? props.src : JSON.stringify(props.src);
  const loaded = !!loadedSrcs[srcKey];

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={24} />
        </div>
      )}
      <Image
        {...props}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
        onLoad={(e) => {
          setLoadedSrcs((prev) => ({ ...prev, [srcKey]: true }));
          onLoad?.(e);
        }}
      />
    </>
  );
}
