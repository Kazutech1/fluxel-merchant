'use client';

import React, { useState } from 'react';
import { Environment, BusinessSettings } from '../../types/dashboard';
import { Bell, Search, ShieldCheck, AlertCircle, LogOut, CheckCircle2, X, Menu } from 'lucide-react';

interface HeaderProps {
  environment: Environment;
  onEnvironmentToggle: (env: Environment) => void;
  businessSettings: BusinessSettings;
  activeTabTitle: string;
  userRole: string;
  onLogout: () => void;
  onOpenMobileSidebar?: () => void;
}

export default function Header({
  environment,
  onEnvironmentToggle,
  businessSettings,
  activeTabTitle,
  userRole,
  onLogout,
  onOpenMobileSidebar,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: '1', title: 'Fiat Deposit Intent Completed', desc: '₦50,000 received for Amina Bello (fdi_99A101)', time: '5m ago' },
    { id: '2', title: 'Risk Review Hold Alert', desc: 'Crypto withdrawal of $2,500 held for review', time: '15m ago' },
    { id: '3', title: 'Lenco Callback Verification', desc: 'Provider signature verified (sub-150ms ACK)', time: '1h ago' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shrink-0">
      {/* Sandbox Warning Banner */}
      {environment === 'sandbox' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 truncate">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">SANDBOX ACTIVE — Simulated keys (`sk_test_*`), real money moves disabled.</span>
          </div>
          <button
            onClick={() => onEnvironmentToggle('live')}
            className="text-xs font-bold text-amber-900 hover:text-amber-700 underline cursor-pointer shrink-0 ml-2"
          >
            Switch Live
          </button>
        </div>
      )}

      <div className="h-16 px-4 sm:px-8 flex items-center justify-between">
        {/* Left Title, Mobile Menu Trigger & Breadcrumb */}
        <div className="flex items-center gap-3">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg fast-transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{activeTabTitle}</h2>
          <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono">
            {businessSettings.merchant_id}
          </span>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Environment Switcher Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => onEnvironmentToggle('live')}
              className={`px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md fast-transition cursor-pointer ${
                environment === 'live'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Live
            </button>
            <button
              onClick={() => onEnvironmentToggle('sandbox')}
              className={`px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md fast-transition cursor-pointer ${
                environment === 'sandbox'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sandbox
            </button>
          </div>

          {/* Notification Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg relative fast-transition cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              SJ
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">Sarah Jenkins</p>
              <p className="text-[10px] text-slate-500 font-medium">{userRole} · {businessSettings.business_name}</p>
            </div>
            <button
              onClick={onLogout}
              title="Logout session"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg fast-transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
