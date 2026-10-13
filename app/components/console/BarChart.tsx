'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { formatDate, formatShortDate } from '../../lib/console/format';
import { formatMajor } from '../../lib/console/money';

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 52 };

function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const base = raw / 10 ** exp;
  return (base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10) * 10 ** exp;
}

/**
 * Single-series daily bars. Gold marks with a 2px gap between them and 4px
 * rounded tops anchored to the baseline; values stay in ink in the tooltip.
 */
export default function BarChart({
  points,
  currency,
  label,
}: {
  points: { t: number; v: number; count: number }[];
  currency: string;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!width || points.length === 0) return null;
    const max = Math.max(...points.map((p) => p.v), 1);
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const slot = innerW / points.length;
    const gap = Math.min(2, slot * 0.25);
    const barW = Math.max(1, slot - gap);
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
    const labelEvery = Math.ceil(points.length / (width < 480 ? 3 : 6));
    return { ticks, slot, barW, y, innerH, labelEvery };
  }, [points, width]);

  const pick = (clientX: number) => {
    if (!geo || !wrap.current) return;
    const x = clientX - wrap.current.getBoundingClientRect().left - PAD.left;
    setActive(Math.max(0, Math.min(points.length - 1, Math.floor(x / geo.slot))));
  };

  const p = active !== null ? points[active] : null;

  return (
    <div
      ref={wrap}
      className="relative select-none outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg"
      style={{ height: HEIGHT }}
      tabIndex={0}
      role="img"
      aria-label={`${label}. Use left and right arrow keys to read each day.`}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        setActive((i) => Math.max(0, Math.min(points.length - 1, (i ?? points.length - 1) + (e.key === 'ArrowLeft' ? -1 : 1))));
      }}
    >
      {geo && (
        <svg width={width} height={HEIGHT} className="block" aria-hidden>
          {geo.ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--color-line)" strokeDasharray={v ? '2 4' : undefined} />
              <text x={PAD.left - 10} y={geo.y(v)} dy="0.32em" textAnchor="end" className="fill-ink-3 font-mono text-[11px]">
                {formatMajor(v, currency, { compact: true }).replace(/ [A-Z]+$/, '')}
              </text>
            </g>
          ))}
          {points.map((pt, i) => {
            const x = PAD.left + i * geo.slot;
            const h = Math.max(0, geo.y(0) - geo.y(pt.v));
            const r = Math.min(4, geo.barW / 2, h);
            const yTop = geo.y(0) - h;
            const path =
              h <= 0
                ? ''
                : `M${x},${geo.y(0)}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + geo.barW - r}Q${x + geo.barW},${yTop} ${x + geo.barW},${yTop + r}V${geo.y(0)}Z`;
            return (
              <g key={pt.t}>
                {active === i && <rect x={x - 1} y={PAD.top} width={geo.barW + 2} height={geo.innerH} fill="var(--color-subtle)" />}
                {path && <path d={path} fill="var(--color-chart)" opacity={active === null || active === i ? 1 : 0.45} />}
                {i % geo.labelEvery === 0 && (
                  <text x={x + geo.barW / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-3 text-[11px]">
                    {formatShortDate(pt.t)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {geo && p && active !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-surface px-3 py-2 shadow-lg"
          style={{ left: Math.min(Math.max(PAD.left + active * geo.slot - 80, 0), width - 170), width: 170 }}
        >
          <p className="text-[11px] text-ink-3">{formatDate(p.t)}</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-ink">{formatMajor(p.v, currency)}</p>
          <p className="text-[11px] text-ink-3">{p.count} {p.count === 1 ? 'deposit' : 'deposits'}</p>
        </div>
      )}
    </div>
  );
}
