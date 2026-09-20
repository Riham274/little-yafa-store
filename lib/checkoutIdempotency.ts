const KEY_STORAGE = "little-yafa-checkout-idempotency-key";

/** A random id identifying the CURRENT checkout attempt, persisted in
 * sessionStorage (not just component state) so it survives a page reload —
 * placeOrder() uses it to detect a retried submission that already
 * succeeded server-side (the transaction previously committed, but the
 * client never received the success response — e.g. a dropped connection
 * right after commit) and safely no-op instead of creating a second order
 * and double-decrementing stock. This is the concrete failure mode behind
 * "it took several attempts before an order finally worked": every earlier
 * "failed" attempt may actually have succeeded, silently placing duplicate
 * orders the customer never saw.
 *
 * Deliberately sessionStorage (survives reload, scoped to this tab) rather
 * than localStorage (would leak into a later, genuinely new checkout in the
 * same browser) — and it's reset after a confirmed success (see
 * resetCheckoutIdempotencyKey()) so the next real order gets its own key. */
export function getCheckoutIdempotencyKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let key = window.sessionStorage.getItem(KEY_STORAGE);
    if (!key) {
      key = crypto.randomUUID();
      window.sessionStorage.setItem(KEY_STORAGE, key);
    }
    return key;
  } catch {
    // Private browsing / storage disabled — the key still works for
    // protecting retries within this same call (placeOrder still gets a
    // key), it just can't survive a reload. Not worth failing checkout
    // over.
    return crypto.randomUUID();
  }
}

/** Must be called right after a successful order (alongside clearing the
 * cart) — otherwise every later, genuinely new order placed in the same
 * browser tab would reuse the same key and be silently treated as a
 * duplicate of the first. */
export function resetCheckoutIdempotencyKey(): void {
  try {
    window.sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // Already gone or inaccessible — nothing more to do.
  }
}
