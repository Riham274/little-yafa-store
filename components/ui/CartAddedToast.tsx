"use client";

// Rendered once, from CartProvider, so any current or future call site of
// addItem() gets this confirmation for free without wiring a toast through
// each caller. Always mounted (never conditionally unmounted) so the
// opacity/translate transition below actually animates in and out instead
// of popping.
export default function CartAddedToast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <div
      aria-live="polite"
      className={`fixed inset-x-0 bottom-6 z-[100] flex justify-center px-gutter pointer-events-none transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 rounded-full shadow-lg border gold-border bg-primary text-on-primary font-label-md text-label-md"
      >
        <span className="material-symbols-outlined text-[20px]">check_circle</span>
        {message}
      </div>
    </div>
  );
}
