import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp, type Unsubscribe } from "firebase/firestore";
import { db } from "./config";
import type { CartItem } from "@/lib/types";

const CART_SESSIONS_COLLECTION = "cartSessions";

// How long a session stays visible to the admin after its last real
// activity. Firestore's own TTL policy (if enabled on `expiresAt` in the
// Firebase Console — see the deployment note alongside firestore.rules)
// physically deletes the document some time after this; the client-side
// filter in subscribeToCartSessions() below hides it from the admin view
// immediately regardless of whether/when that physical deletion has
// actually run, since TTL deletion isn't instant (Google documents it can
// take up to ~72h after expiry).
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Deliberately a minimal subset of CartItem — no name/colorLabel/image/
// stock/originalPrice. The admin page re-resolves current product data
// live (see getProductByIdForAdmin in products.ts) rather than trusting a
// stale client-side snapshot, and this collection must never carry
// anything beyond what "which product/color/size/qty is in an anonymous
// cart" requires.
export type CartSessionItem = {
  productId: string;
  color: string;
  size: string;
  qty: number;
  price: number;
};

export type CartSession = {
  id: string;
  items: CartSessionItem[];
  updatedAt: number;
};

/** Overwrites this session's document with the cart's current full
 * contents (not a merge — the local cart is always the source of truth).
 * An empty cart deletes the session instead of writing an empty one, since
 * an emptied-but-never-checked-out cart isn't "pending" anything anymore
 * — same end state as the explicit delete on successful checkout. */
export async function syncCartSession(sessionId: string, items: CartItem[]): Promise<void> {
  if (!sessionId) return;
  if (items.length === 0) {
    await deleteCartSession(sessionId);
    return;
  }
  await setDoc(doc(db, CART_SESSIONS_COLLECTION, sessionId), {
    items: items.map(
      (item): CartSessionItem => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        qty: item.qty,
        price: item.price ?? 0,
      })
    ),
    updatedAt: serverTimestamp(),
    // Recomputed on every sync (not derived from updatedAt server-side —
    // Firestore TTL needs a concrete Timestamp field to point at), so an
    // actively-updated cart's expiry keeps sliding forward.
    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  });
}

/** Called once a cart's contents become a real order — the order itself is
 * now the durable record (visible in the admin Orders page), so its
 * "pending" tracking doc is removed rather than left to expire. */
export async function deleteCartSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await deleteDoc(doc(db, CART_SESSIONS_COLLECTION, sessionId));
}

function toCartSession(id: string, data: Record<string, unknown>): CartSession {
  const rawUpdatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  return {
    id,
    items: Array.isArray(data.items) ? (data.items as CartSessionItem[]) : [],
    updatedAt: rawUpdatedAt?.toMillis ? rawUpdatedAt.toMillis() : 0,
  };
}

/** Admin-only (see firestore.rules). Live list of every still-active
 * (not converted to an order, not past the 30-day expiry window) cart
 * session, for the "Pending Carts" page. */
export function subscribeToCartSessions(callback: (sessions: CartSession[]) => void): Unsubscribe {
  return onSnapshot(collection(db, CART_SESSIONS_COLLECTION), (snap) => {
    const cutoff = Date.now() - EXPIRY_MS;
    const sessions = snap.docs
      .map((d) => toCartSession(d.id, d.data()))
      // updatedAt > 0 excludes a doc whose serverTimestamp() write hasn't
      // resolved yet (briefly null in a fresh onSnapshot before the server
      // round-trip completes) rather than showing it as "30 days stale".
      .filter((s) => s.updatedAt > 0 && s.updatedAt > cutoff);
    callback(sessions);
  });
}
