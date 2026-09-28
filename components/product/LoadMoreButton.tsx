"use client";

import { useLanguage } from "@/context/LanguageContext";

// Shared "Load More" button for paginated product grids.
//
// `[overflow-anchor:none]` keeps the button out of the browser's scroll
// anchoring. The button is usually the element on screen when it's clicked,
// so without this, Chrome anchors the viewport to IT — and when the new
// products render above it, it scrolls the page down to follow the button,
// skipping straight past the products that just loaded. Excluded, the
// browser anchors to a product card instead, so the view stays put and the
// new products simply appear below the ones already showing.
export default function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="flex justify-center mt-lg [overflow-anchor:none]">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 px-lg py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50"
      >
        {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
        {t.category.loadMore}
      </button>
    </div>
  );
}
