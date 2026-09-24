declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const READY_POLL_MS = 100;
const READY_MAX_WAIT_MS = 5000;

// Guards every call site against the pixel script not having loaded yet or
// not being present at all (e.g. blocked by an ad blocker) — callers never
// need their own typeof-window/typeof-fbq checks. The brief poll (rather
// than a one-shot typeof check) matters in practice: measured directly,
// window.fbq is still undefined immediately after a fast-mounting page like
// order-confirmation fires its load-triggered effect — the
// strategy="afterInteractive" <Script> in app/layout.tsx hasn't necessarily
// run yet by then, so a one-shot check silently drops events like Purchase
// that only ever fire once per order.
export function trackPixelEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") {
    window.fbq("track", event, params);
    return;
  }
  const start = Date.now();
  const interval = setInterval(() => {
    if (typeof window.fbq === "function") {
      clearInterval(interval);
      window.fbq("track", event, params);
    } else if (Date.now() - start > READY_MAX_WAIT_MS) {
      clearInterval(interval);
    }
  }, READY_POLL_MS);
}
