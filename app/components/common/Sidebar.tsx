'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Send,
  Code2,
  ShieldCheck,
  Settings,
  Activity,
  X,
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'customers'
  | 'transactions'
  | 'payouts'
  | 'transfers'
  | 'developers'
  | 'team'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingReviewCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  pendingReviewCount,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <Activity className="w-4 h-4" /> },
    {
      id: 'payouts',
      label: 'Payouts & Holds',
      icon: <Send className="w-4 h-4" />,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { id: 'transfers', label: 'Transfers', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'developers', label: 'Developer Portal', icon: <Code2 className="w-4 h-4" /> },
    { id: 'team', label: 'Team & RBAC', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const sidebarContent = (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src="/fluxel_logo.png"
            alt="Fluxel Logo"
            className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow-md"
          />
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wider leading-none">FLUXEL</h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Merchant Portal</span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg fast-transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold fast-transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Rails</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            100% Operational
          </span>
        </div>
        <div className="text-[11px] text-slate-300 font-mono">
          <div>Lenco MFB: <span className="text-emerald-400">Active</span></div>
          <div>EVM / TRON: <span className="text-emerald-400">Connected</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block shrink-0 min-h-screen sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
