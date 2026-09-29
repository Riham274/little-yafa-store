"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Remembers what a product listing had loaded ("Load More" pages, sort, the
// pagination cursor, ...) so going BACK to it from a product page can
// rebuild the exact same list instead of starting over at page 1.
//
// Why this is needed: opening a product unmounts the listing page, so on
// Back it mounts fresh — and a fresh mount only has the first page. The
// saved scroll position (useScrollRestoration) is then deeper than that
// shorter page, so the customer lands near the top with the product they
// came from gone. Restoring the list synchronously, on the page's very first
// render, means the page is already its full height when useScrollRestoration
// scrolls in its layout effect.
//
// "Is this a Back to the same listing?" is answered by the browser history
// entry itself, not by timing: each listing tags its history entry with an
// ID (in history.state), and the saved list carries the same ID. The browser
// restores an entry's state before anything re-renders, so on Back the tag
// is already there on the first render — whereas a popstate flag can still
// be unset when Next renders the page (it renders straight from its own
// popstate handler). A fresh visit (menu, link, search) creates a new entry
// with no tag, so it always starts at page 1.
//
// In-memory (module-level) on purpose: it lives exactly as long as the
// browser tab's JS session, which is what back/forward within the site
// needs; a full reload starts clean.

// Past this, Back shows a fresh first page rather than possibly outdated
// products/stock.
const MAX_AGE_MS = 15 * 60 * 1000;
const HISTORY_FIELD = "__littleYafaListing";

const saved = new Map<string, { id: string; value: unknown; savedAt: number }>();

function historyTag(key: string): string | undefined {
  return (window.history.state as Record<string, Record<string, string> | undefined> | null)?.[HISTORY_FIELD]?.[key];
}

// Writes the tag into the CURRENT history entry, keeping everything else in
// it (Next's own router state included — passing that through untouched is
// what makes Next's patched replaceState leave the call alone). No URL
// argument, so the router isn't told the URL changed.
function tagHistoryEntry(key: string, id: string) {
  const state = (window.history.state ?? {}) as Record<string, unknown>;
  const tags = (state[HISTORY_FIELD] ?? {}) as Record<string, string>;
  if (tags[key] === id) return;
  window.history.replaceState({ ...state, [HISTORY_FIELD]: { ...tags, [key]: id } }, "");
}

/** For a listing page: `restored` is what it had loaded when the customer
 * left it, if this render is them coming back to that same history entry
 * (and it's under 15 minutes old); otherwise null. Read it in useState
 * initializers so the restored list is in the DOM before scroll restoration
 * runs. Call `save` whenever the listing's state changes.
 *
 * `variant` distinguishes listings on the same path whose contents differ
 * (e.g. the search query). The path comes from usePathname(), not
 * window.location: on a link navigation Next renders the new page before
 * it updates the address bar. */
export function useListingCache<T>(prefix: string, variant = "") {
  const pathname = usePathname();
  const [{ key, id, restored }] = useState(() => {
    if (typeof window === "undefined") return { key: "", id: "", restored: null as T | null };
    const key = `${prefix}:${pathname}${variant ? `?${variant}` : ""}`;
    const entry = saved.get(key);
    const tag = historyTag(key);
    const isBack = !!entry && !!tag && entry.id === tag && Date.now() - entry.savedAt <= MAX_AGE_MS;
    return {
      key,
      id: isBack && tag ? tag : Math.random().toString(36).slice(2),
      restored: isBack && entry ? (entry.value as T) : null,
    };
  });

  // Tag this history entry now, and again right before the customer leaves
  // (Next rewrites the entry's state after some of its own navigations,
  // e.g. a filter change on this same page, which drops the tag). Capture
  // phase, so it runs before the click starts any navigation.
  useEffect(() => {
    if (!key) return;
    tagHistoryEntry(key, id);
    const onClick = (e: Event) => {
      if (e.isTrusted) tagHistoryEntry(key, id);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [key, id]);

  const save = useCallback(
    (value: T) => {
      if (key) saved.set(key, { id, value, savedAt: Date.now() });
    },
    [key, id]
  );

  return { restored, save };
}
