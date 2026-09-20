import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import type { CartItem } from "@/lib/types";

const ORDER_ERRORS_COLLECTION = "orderErrors";

/** A lightweight diagnostic log of failed checkout attempts — admin-only
 * read (see firestore.rules), so it can safely hold the customer's contact
 * details (matching how `orders` itself already stores them), which is
 * exactly what's needed to trace a vague support report ("it didn't work
 * for me") back to what actually happened, without depending on the
 * customer to describe the error themselves.
 *
 * Best-effort and non-blocking by design — call sites must never let a
 * failure here delay showing the customer their own error message, or
 * block them from retrying. Console-logging the original error remains the
 * primary, always-available diagnostic (this is a durable supplement to
 * it, not a replacement — a browser console is gone the moment the tab
 * closes). */
export async function logOrderError(input: {
  items: CartItem[];
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  error: unknown;
}): Promise<void> {
  const err = input.error;
  await addDoc(collection(db, ORDER_ERRORS_COLLECTION), {
    errorMessage: err instanceof Error ? err.message : String(err),
    errorName: err instanceof Error ? err.name : null,
    // FirebaseError instances carry a `.code` (e.g. "unavailable",
    // "permission-denied") that's often the single most useful field for
    // telling a network blip apart from a rules/config problem.
    errorCode: typeof (err as { code?: unknown })?.code === "string" ? (err as { code: string }).code : null,
    items: input.items.map((item) => ({
      productId: item.productId,
      color: item.color,
      size: item.size,
      qty: item.qty,
      price: item.price ?? 0,
    })),
    customerName: input.customerName || null,
    customerPhone: input.customerPhone || null,
    subtotal: input.subtotal,
    // Firestore rejects `undefined` field values outright — `typeof
    // navigator !== "undefined"` alone isn't enough of a guard, since
    // `navigator.onLine` itself can still resolve to `undefined` in some
    // environments (e.g. Node's built-in navigator polyfill has no
    // `onLine` at all), so each value gets its own `?? null` too.
    userAgent: (typeof navigator !== "undefined" ? navigator.userAgent : null) ?? null,
    online: (typeof navigator !== "undefined" ? navigator.onLine : null) ?? null,
    createdAt: serverTimestamp(),
  });
}
