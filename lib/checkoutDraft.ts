import type { ShippingRegion } from "@/lib/types";
import { DEFAULT_COUNTRY_DIAL } from "@/lib/countryCodes";

const DRAFT_KEY = "checkout-draft";

// Same debounce window as the admin product-form draft autosave (see
// components/admin/ProductFormModal.tsx) — long enough that a customer
// actively typing doesn't trigger a write on every keystroke, short enough
// that a crash/accidental navigation loses very little.
export const CHECKOUT_DRAFT_SAVE_DEBOUNCE_MS = 2500;

export type CheckoutDraft = {
  fullName: string;
  // Split to match the checkout form's country-code selector + number
  // fields (see PhoneNumberField in checkout/page.tsx) rather than one
  // combined string, so re-opening the form shows the same two fields the
  // customer actually filled in, not a merged "+970599999999" value.
  phoneCountryCode: string;
  phoneNumber: string;
  phoneBackupCountryCode: string;
  phoneBackupNumber: string;
  address: string;
  notes: string;
  region: ShippingRegion | null;
};

// Deliberately separate from lib/checkoutIdempotency.ts (a different
// localStorage-vs-sessionStorage mechanism for a different purpose — that
// one exists so a RETRY of the same submission can't double-place an
// order; this one exists purely so the customer doesn't have to retype
// their details after a reload). Neither reads nor writes the other's key.

/** Reads whatever was last saved, or null if there's no draft (or
 * localStorage is unavailable/corrupted) — unlike the admin form's
 * version, checkout restores silently on load with no "restore?" prompt,
 * since this is the customer's own data with no translation side effect to
 * warn about.
 *
 * Defensively normalizes the phone fields rather than trusting the parsed
 * shape outright: a returning customer can still have a pre-split-phone-
 * field draft (`{ phone: "..." }`) sitting in their browser from before this
 * field was split into country-code + number, and a raw cast would leave
 * the new fields `undefined` instead of sensible defaults. */
export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft> & { phone?: string };
    return {
      fullName: parsed.fullName ?? "",
      phoneCountryCode: parsed.phoneCountryCode || DEFAULT_COUNTRY_DIAL,
      phoneNumber: parsed.phoneNumber ?? parsed.phone ?? "",
      phoneBackupCountryCode: parsed.phoneBackupCountryCode || DEFAULT_COUNTRY_DIAL,
      phoneBackupNumber: parsed.phoneBackupNumber ?? "",
      address: parsed.address ?? "",
      notes: parsed.notes ?? "",
      region: parsed.region ?? null,
    };
  } catch {
    // Corrupted/inaccessible localStorage — proceed as if there were no
    // draft rather than crash the page.
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Quota exceeded / private browsing — autosave is a nice-to-have, fail
    // silently rather than interrupt checkout with an error.
  }
}

/** Called the moment an order is successfully placed — NOT on every
 * navigation away, so a customer who goes back to the cart mid-checkout
 * still finds their details filled in if they come back to finish later. */
export function clearCheckoutDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Already gone or inaccessible — nothing more to do.
  }
}
