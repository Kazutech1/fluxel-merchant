'use client';

import React, { useMemo } from 'react';
import { create } from 'qrcode';

interface QrCodeProps {
  value: string;
  className?: string;
}

/** Spec-mandated quiet zone, in modules. */
const MARGIN = 4;

/**
 * A genuinely scannable QR — unlike the decorative grid in QrCodeModal, which
 * draws finder patterns plus hash-seeded noise. On a checkout someone will
 * actually point a phone at this.
 *
 * Always rendered dark-on-white regardless of theme; inverted codes defeat
 * some scanners.
 */
export default function QrCode({ value, className = 'w-44 h-44' }: QrCodeProps) {
  const { path, extent } = useMemo(() => {
    try {
      const qr = create(value, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const data = qr.modules.data;

      let d = '';
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (data[row * size + col]) {
            d += `M${col + MARGIN} ${row + MARGIN}h1v1h-1z`;
          }
        }
      }
      return { path: d, extent: size + MARGIN * 2 };
    } catch {
      return { path: '', extent: 0 };
    }
  }, [value]);

  if (!path) return null;

  return (
    <div className={`bg-white rounded-xl p-3 ${className}`}>
      <svg
        viewBox={`0 0 ${extent} ${extent}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label="QR code for the deposit address"
      >
        <path d={path} fill="#0f172a" />
      </svg>
    </div>
  );
}
