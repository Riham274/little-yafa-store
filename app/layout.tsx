import type { Metadata } from "next";
import { Playfair_Display, Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";

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
  title: "Little Yafa | Premium Baby Boutique",
  description:
    "Little Yafa — Premium organic baby clothing and accessories. Handcrafted with love, inspired by Palestine.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="scroll-smooth">
      <head>
        {/* Material Symbols is a variable icon font referenced by ligature
            name throughout the ported markup (e.g. "shopping_bag"); it isn't
            available via next/font/google, so it's loaded the same way the
            original Stitch export did. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} ${ibmPlexSansArabic.variable} bg-surface text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed`}
      >
        <LanguageProvider>
          <CartProvider>{children}</CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
