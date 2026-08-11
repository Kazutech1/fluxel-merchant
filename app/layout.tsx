import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fluxel — Merchant Console",
  description:
    "Unified NGN and stablecoin settlement for merchants: collections, payouts, and reconciliation.",
};

/**
 * Applies the stored theme before first paint. Without this the theme is only
 * set in a useEffect, so every cold load — most visibly the checkout, which is
 * always opened fresh from a link — paints light and then snaps to dark.
 */
const THEME_BOOTSTRAP = `
(function(){try{
  var t = localStorage.getItem('fluxel_theme');
  document.documentElement.classList.toggle('dark', t !== 'light');
}catch(e){
  document.documentElement.classList.add('dark');
}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
