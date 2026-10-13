import type { MetadataRoute } from 'next';

/** Lets the console be installed to a phone or desktop home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fluxel Merchant Console',
    short_name: 'Fluxel',
    description: 'Collect naira and stablecoin payments, pay out to any Nigerian bank, and reconcile it all in one place.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
