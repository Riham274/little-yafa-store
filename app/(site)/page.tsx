import Image from "next/image";
import { getHeroBannerUrl } from "@/lib/firebase/siteSettings";
import HomePageBelowFold from "@/components/home/HomePageBelowFold";
import { proxiedImageUrl } from "@/lib/imageProxy";

// Shown until an admin uploads a replacement through the admin Settings
// page (app/admin/dashboard/settings) — kept in public/ as the permanent
// fallback, not deleted once a live banner exists.
const DEFAULT_HERO_BANNER = "/new-hero-banner.png";

// Deliberately a Server Component (no "use client"): the hero banner below
// is this page's LCP element, and neither it nor the logo above it need any
// translated text (both alt strings are fixed, non-localized copy) — so
// there's no reason this section has to wait for the client JS bundle to
// download, parse, and hydrate before it can even start loading. Rendering
// it server-side means the <img> tag (and the correct src, custom banner or
// default) is present in the very first HTML response, so the browser's
// preload scanner can start fetching it immediately, in parallel with the
// JS bundle — instead of only being able to request it once React has
// hydrated enough to render it, which is what the old fully-client version
// did.
//
// This is real ISR (`revalidate` below), not force-dynamic — a plain
// server-rendered-per-request page would re-hit Firestore on every single
// visit, which works against the whole point of this pass. The locale-flash
// concern that previously ruled ISR out for the rest of the site doesn't
// apply here: this section has no translated text at all to render in the
// wrong language, so there's nothing for a stale cache to get wrong beyond
// the banner image itself, which is already the intentional tradeoff below.
// 3 minutes, not 60s: every regeneration is a billed Vercel ISR write, and
// 60s across these pages used up the free plan's ISR write quota.
export const revalidate = 180;

export default async function HomePage() {
  let heroBannerUrl = DEFAULT_HERO_BANNER;
  try {
    const url = await getHeroBannerUrl();
    if (url) heroBannerUrl = url;
  } catch {
    // Keep the static fallback — e.g. a transient Firestore hiccup.
  }

  return (
    <>
      {/* Logo showcase */}
      <section className="bg-[#5A5F44] px-gutter pt-md pb-sm md:pt-[40px] md:pb-md flex justify-center fade-in-up">
        <Image
          src="/logo-hero.png"
          alt="Little Yafa — Baby & Kids Store"
          width={628}
          height={397}
          preload
          // Without `sizes`, next/image can't tell this is rendered at a
          // fraction of its intrinsic width — it falls back to 1x/2x
          // device-pixel-ratio srcset entries sized off the full 628px
          // intrinsic width, so every visitor (mobile included) downloads
          // the ~640-1920px bucket regardless of the ~96-160px it's
          // actually displayed at. This matches the fixed w-24/sm:w-28/
          // md:w-36/lg:w-40 breakpoints in className below.
          sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, (max-width: 1024px) 144px, 160px"
          className="w-24 sm:w-28 md:w-36 lg:w-40 h-auto"
        />
      </section>

      {/* Hero banner */}
      <section className="w-full fade-in-up">
        <Image
          src={proxiedImageUrl(heroBannerUrl)}
          alt="Little Yafa — a little touch of magic"
          width={1364}
          height={768}
          preload
          // Same missing-`sizes` issue as the logo above, but with more
          // headroom to go wrong: this section has no max-width wrapper
          // (see app/(site)/layout.tsx — `<main>` is unconstrained), so the
          // image is genuinely edge-to-edge on every viewport, not capped
          // at the site's usual 1280px container. 100vw matches that.
          sizes="100vw"
          className="w-full h-auto block"
        />
      </section>

      <HomePageBelowFold />
    </>
  );
}
