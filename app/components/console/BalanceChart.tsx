'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { formatDate, formatMoney, formatShortDate } from '../../lib/console/format';
import type { Currency } from '../../lib/console/types';

interface Point {
  t: number;
  v: number;
}

const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

/** Rounds a raw step up to 1, 2 or 5 × 10ⁿ so gridlines land on clean values. */
function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const base = raw / 10 ** exp;
  const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

/**
 * Single-series balance-over-time area chart. The title outside names the
 * series, so there's no legend; the line is the only coloured mark, values
 * stay in ink. Hover or arrow keys move a crosshair with the day's balance.
 */
export default function BalanceChart({ points, currency }: { points: Point[]; currency: Currency }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (width === 0 || points.length < 2) return null;
    const values = points.map((p) => p.v);
    const max = Math.max(...values);
    const step = niceStep(Math.max(max, 1) / 4);
    const top = Math.ceil(max / step) * step || step;
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
    const area = `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

    const labelCount = Math.min(points.length, width < 480 ? 3 : 5);
    const xLabels = Array.from({ length: labelCount }, (_, i) =>
      Math.round((i / (labelCount - 1)) * (points.length - 1))
    );

    return { x, y, line, area, ticks, xLabels, innerW };
  }, [points, width]);

  const pickIndex = (clientX: number) => {
    if (!geo || !wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const ratio = (clientX - rect.left - PAD.left) / geo.innerW;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setActive((i) => {
      const start = i ?? points.length - 1;
      return Math.max(0, Math.min(points.length - 1, start + (e.key === 'ArrowLeft' ? -1 : 1)));
    });
  };

  const activePoint = active !== null ? points[active] : null;

  return (
    <div>
      <div
        ref={wrap}
        className="relative select-none touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded-lg"
        style={{ height: HEIGHT }}
        tabIndex={0}
        role="img"
        aria-label={`Balance chart. Use left and right arrow keys to read daily values.`}
        onPointerMove={(e) => pickIndex(e.clientX)}
        onPointerDown={(e) => pickIndex(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        {geo && (
          <svg width={width} height={HEIGHT} className="block overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--color-chart)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {geo.ticks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geo.y(v)}
                  y2={geo.y(v)}
                  stroke="var(--color-line)"
                  strokeDasharray={v === 0 ? undefined : '2 4'}
                />
                <text
                  x={PAD.left - 10}
                  y={geo.y(v)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-ink-3 font-mono text-[11px]"
                >
                  {formatMoney(v, currency, { compact: true }).replace(' USDT', '')}
                </text>
              </g>
            ))}

            {geo.xLabels.map((i, n) => (
              <text
                key={i}
                x={geo.x(i)}
                y={HEIGHT - 8}
                textAnchor={n === 0 ? 'start' : n === geo.xLabels.length - 1 ? 'end' : 'middle'}
                className="fill-ink-3 text-[11px]"
              >
                {formatShortDate(points[i].t)}
              </text>
            ))}

            <path d={geo.area} fill={`url(#${gradientId})`} />
            <path d={geo.line} fill="none" stroke="var(--color-chart)" strokeWidth={2} strokeLinejoin="round" />

            {active !== null && activePoint && (
              <g>
                <line
                  x1={geo.x(active)}
                  x2={geo.x(active)}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  stroke="var(--color-ink-3)"
                  strokeWidth={1}
                />
                <circle
                  cx={geo.x(active)}
                  cy={geo.y(activePoint.v)}
                  r={4.5}
                  fill="var(--color-chart)"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>
        )}

        {geo && active !== null && activePoint && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-surface px-3 py-2 shadow-lg"
            style={{
              left: Math.min(Math.max(geo.x(active) - 80, 0), width - 160),
              width: 160,
            }}
          >
            <p className="text-[11px] text-ink-3">{formatDate(activePoint.t)}</p>
            <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-ink">
              {formatMoney(activePoint.v, currency)}
            </p>
          </div>
        )}
      </div>

      {/* The same numbers as a table, for screen readers. Hidden on a wrapper
          div because `overflow: hidden` doesn't clip a <table> — a bare
          sr-only table leaks its full height and stretches the page. */}
      <div className="sr-only">
        <table>
          <caption>Daily closing balance in {currency}</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.t}>
                <td>{formatDate(p.t)}</td>
                <td>{formatMoney(p.v, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
