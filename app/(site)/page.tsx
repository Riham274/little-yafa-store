import Image from "next/image";
import { getHeroBannerUrl } from "@/lib/firebase/siteSettings";
import HomePageBelowFold from "@/components/home/HomePageBelowFold";

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
export const revalidate = 60;

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
          className="w-24 sm:w-28 md:w-36 lg:w-40 h-auto"
        />
      </section>

      {/* Hero banner */}
      <section className="w-full fade-in-up">
        <Image
          src={heroBannerUrl}
          alt="Little Yafa — a little touch of magic"
          width={1364}
          height={768}
          preload
          className="w-full h-auto block"
        />
      </section>

      <HomePageBelowFold />
    </>
  );
}
