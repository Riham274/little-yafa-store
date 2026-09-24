import type { Metadata } from "next";
import Script from "next/script";
import { Playfair_Display, Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import DeferredMaterialSymbols from "@/components/layout/DeferredMaterialSymbols";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const META_PIXEL_ID = "1744553700152244";

export const metadata: Metadata = {
  title: "Little Yafa Store",
  description:
    "Little Yafa — Premium organic baby clothing and accessories. Handcrafted with love, inspired by Palestine.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="scroll-smooth">
      <head>
        {/* Opens the TLS connection to Firestore/Storage before the app's JS
            even finishes loading, so the first read/image request doesn't
            also pay for DNS+TLS handshake latency. Storage needs
            crossOrigin since images are fetched cross-origin by next/image;
            Firestore's WebChannel connection doesn't use CORS credentials,
            so it's left off there. */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        {/* Speeds up the deferred Material Symbols fetch below once it does
            fire — preconnect itself is not render-blocking. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* strategy="afterInteractive" so this loads once the page is
            interactive rather than during the critical initial load — kept
            off the LCP/CLS-sensitive path the rest of app/layout.tsx and the
            category-page ISR work is built around. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} ${ibmPlexSansArabic.variable} bg-surface text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed`}
      >
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            alt=""
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        <DeferredMaterialSymbols />
        <LanguageProvider>
          <CartProvider>{children}</CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
