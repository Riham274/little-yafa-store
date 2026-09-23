"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const STORAGE_PREFIX = "scroll:";

function scrollKey(): string {
  return STORAGE_PREFIX + window.location.pathname + window.location.search;
}

/** Restores + remembers scroll position per exact URL (path + query string)
 * for pages like the category listings, which stopped using
 * useSearchParams() (see e.g. app/(site)/bath/BathPageClient.tsx) so they
 * could be statically generated/cached under ISR. That removal is also why
 * this hook is needed at all: Next's own built-in scroll restoration
 * reliably worked before it (confirmed against the home page, which has no
 * client-side URL-reading mount effect and restores scroll correctly on
 * its own) but doesn't fire for these pages anymore — empirically, a back
 * navigation to one of them now gets a genuinely fresh mount (this hook's
 * own restore effect, and the pages' cursor-harvest/filter-reading effects,
 * all re-run), yet scroll stays pinned at the top the entire time rather
 * than at any point briefly reflecting the old position — so this replaces
 * Next's restoration with an explicit one instead of trying to coax the
 * built-in mechanism back into firing. */
export function useScrollRestoration(): void {
  // Read fresh on every render (not just once) so a filter change — which
  // updates the URL via router.push() without unmounting this component,
  // see e.g. handleSizeAgeChange() in these pages — keeps this pointed at
  // whatever URL the page is actually showing right now. Guarded for SSR:
  // the very first (server) render has no `window` at all.
  const keyRef = useRef("");
  if (typeof window !== "undefined") keyRef.current = scrollKey();

  // useLayoutEffect (not useEffect) so the restore happens before the
  // browser paints the frame, avoiding a visible jump from the top down to
  // the restored position.
  useLayoutEffect(() => {
    const saved = sessionStorage.getItem(keyRef.current);
    if (saved == null) return;
    const y = Number(saved);
    // { behavior: "instant" } is required, not just window.scrollTo(0, y):
    // <html> carries Tailwind's scroll-smooth class (app/layout.tsx), which
    // sets CSS scroll-behavior: smooth globally and hijacks the two-argument
    // form into an animated scroll — one that a second call (or anything
    // else on the page touching scroll during that animation) can interrupt
    // mid-flight, landing short of the target instead of jumping straight
    // to it. Passing behavior explicitly overrides the CSS per spec.
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    // A second pass shortly after: if this mount is for a filtered URL, the
    // very first paint still shows the unfiltered grid (initialProducts,
    // rendered directly into the cached HTML — see e.g. BathPageClient.tsx)
    // until the page's own filter-reading mount effect narrows it a beat
    // later. That narrowing can shrink the page and nudge scroll away from
    // the position just restored above, so this re-asserts it once that
    // settles rather than leaving the first restore to be quietly undone.
    const id = requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saves the scroll position at the moment the user clicks anything (a
  // product card, a nav link, the footer's "Previous Page" button) — i.e.
  // the moment a navigation away is about to begin. This has to run in the
  // capture phase on click, not on unmount: measured directly, by the time
  // this component actually unmounts, window.scrollY has *already* moved
  // away from where the user left off (confirmed empirically — clicking a
  // product at scrollY 1500 left sessionStorage holding ~342 within 50ms,
  // before the new route had even finished mounting). A capture-phase click
  // listener fires synchronously before that — before React's onClick or
  // the router's own navigation logic even run — so it reads the true
  // pre-navigation position.
  //
  // The isTrusted check matters: the navigation itself fires a second,
  // synthetic ("untrusted") click with no target shortly after the real
  // one, once the new route's URL is already live — confirmed by logging
  // window.location inside this handler, which showed the *new* page's URL
  // by the time that second click arrived, while still bound to this old
  // page's listener. Without filtering it out, it overwrites the value the
  // real click just saved with scrollY read from the page already being
  // navigated away to, which is what was actually causing the broken
  // restore. A real user's click (mouse or keyboard-activated) is always
  // trusted, so this doesn't affect genuine navigations.
  //
  // An earlier version of this hook saved continuously via a plain scroll
  // listener instead, but window.scrollTo() itself fires a native "scroll"
  // event, so the restore effect above was triggering that same listener
  // and immediately overwriting the just-restored value with whatever
  // scrollY read moments into the restore — save-on-click sidesteps that
  // problem too.
  useEffect(() => {
    const save = (e: Event) => {
      if (!(e as MouseEvent).isTrusted) return;
      sessionStorage.setItem(keyRef.current, String(window.scrollY));
    };
    document.addEventListener("click", save, true);
    return () => document.removeEventListener("click", save, true);
  }, []);
}
