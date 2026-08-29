"use client";

import { useEffect } from "react";

const HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";

// Material Symbols is only used for small icon glyphs (nav icons, cart
// button, badges, etc.) — never the page's LCP element — so there's no
// reason this stylesheet needs to be render-blocking. Rendered directly in
// <head> as a plain <link rel="stylesheet">, it was one of the biggest
// contributors to render-blocking-resource time (a synchronous external
// CSS fetch the browser must complete before it can paint anything).
// Injecting the <link> after mount instead removes it from the critical
// rendering path entirely: icons briefly show their raw ligature text
// (e.g. "shopping_bag") until the font loads and swaps in — the same
// tradeoff `font-display: swap` makes for text fonts, just applied to an
// icon font instead.
export default function DeferredMaterialSymbols() {
  useEffect(() => {
    if (document.querySelector(`link[href="${HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}
