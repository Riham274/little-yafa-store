import type { Metadata } from "next";
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
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} ${ibmPlexSansArabic.variable} bg-surface text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed`}
      >
        <DeferredMaterialSymbols />
        <LanguageProvider>
          <CartProvider>{children}</CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
