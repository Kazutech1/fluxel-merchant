import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fluxel's brand faces (fluxeltech.com): Inter Tight for text, JetBrains Mono
// for figures and identifiers.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fluxel — Merchant Console",
  description:
    "Unified NGN and stablecoin settlement for merchants: collections, payouts, and reconciliation.",
};

/**
 * Applies the stored theme (light unless dark was chosen) before first paint.
 * Without this the theme is only set in a useEffect, so a cold load in dark
 * mode — most visibly the checkout, always opened fresh from a link — paints
 * light and then snaps to dark.
 */
const THEME_BOOTSTRAP = `
(function(){try{
  var t = localStorage.getItem('fluxel_theme');
  document.documentElement.classList.toggle('dark', t === 'dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The bootstrap script toggles `dark` on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
