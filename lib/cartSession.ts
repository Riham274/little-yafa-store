const SESSION_KEY = "little-yafa-cart-session-id";

/** A random, anonymous id identifying this browser's cart for the
 * "pending carts" admin insight feature — deliberately separate from any
 * auth/customer identity (customers never sign in at all) and from
 * `little-yafa-cart` (the cart's own contents). Persisted so the same
 * session id is reused across visits until localStorage is cleared,
 * letting an admin see a cart's contents evolve rather than a fresh
 * "session" appearing every time the page reloads. */
export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled — cart tracking is a nice-to-have
    // analytics feature, not something the shopping flow depends on.
    return "";
  }
}
