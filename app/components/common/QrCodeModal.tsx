'use client';

import React, { useState } from 'react';
import { QrCode, X, Copy, Check, ShieldCheck } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  qrPayload: string;
  onClose: () => void;
}

export default function QrCodeModal({
  isOpen,
  title,
  subtitle,
  qrPayload,
  onClose,
}: QrCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate deterministic grid pattern for QR simulation
  const generateQrModules = (seedStr: string) => {
    const modules: boolean[][] = [];
    const size = 21;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        // Finder pattern top-left
        if (r < 7 && c < 7) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          row.push(isBorder || isCenter);
        }
        // Finder pattern top-right
        else if (r < 7 && c >= size - 7) {
          const isBorder = r === 0 || r === 6 || c === size - 7 || c === size - 1;
          const isCenter = r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3;
          row.push(isBorder || isCenter);
        }
        // Finder pattern bottom-left
        else if (r >= size - 7 && c < 7) {
          const isBorder = r === size - 7 || r === size - 1 || c === 0 || c === 6;
          const isCenter = r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4;
          row.push(isBorder || isCenter);
        }
        // Data modules based on hash
        else {
          const val = (Math.abs(hash) + r * 31 + c * 17) % 3 === 0;
          row.push(val);
        }
      }
      modules.push(row);
    }
    return modules;
  };

  const modules = generateQrModules(qrPayload);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95 duration-150 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 fast-transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 w-fit mx-auto mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5 mb-4">{subtitle}</p>

        {/* Vector SVG QR Code Container */}
        <div className="p-4 bg-white border-2 border-slate-900 rounded-xl shadow-inner w-56 h-56 mx-auto flex items-center justify-center mb-4">
          <svg viewBox="0 0 21 21" className="w-full h-full shape-rendering-crisp">
            {modules.map((row, r) =>
              row.map((cell, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c}
                  y={r}
                  width={1}
                  height={1}
                  fill={cell ? '#0f172a' : '#ffffff'}
                />
              ))
            )}
          </svg>
        </div>

        {/* Payload Copy Bar */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-slate-800 truncate font-semibold select-all">{qrPayload}</span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded flex items-center gap-1 shrink-0 fast-transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          Scan QR Code using any crypto mobile wallet or banking app to deposit.
        </p>
      </div>
    </div>
  );
}
