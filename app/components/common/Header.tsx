'use client';

import React, { useState } from 'react';
import { Environment, BusinessSettings } from '../../types/dashboard';
import { Bell, Search, ShieldCheck, AlertCircle, LogOut, CheckCircle2, X, Menu, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  environment: Environment;
  onEnvironmentToggle: (env: Environment) => void;
  businessSettings: BusinessSettings;
  activeTabTitle: string;
  userRole: string;
  onLogout: () => void;
  onOpenMobileSidebar?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function Header({
  environment,
  onEnvironmentToggle,
  businessSettings,
  activeTabTitle,
  userRole,
  onLogout,
  onOpenMobileSidebar,
  theme = 'dark',
  onToggleTheme,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: '1', title: 'Fiat Deposit Intent Completed', desc: '₦50,000 received for Amina Bello (fdi_99A101)', time: '5m ago' },
    { id: '2', title: 'Risk Review Hold Alert', desc: 'Crypto withdrawal of $2,500 held for review', time: '15m ago' },
    { id: '3', title: 'Lenco Callback Verification', desc: 'Provider signature verified (sub-150ms ACK)', time: '1h ago' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#141416] border-b border-slate-200 dark:border-[#222226] shrink-0 fast-transition">
      {/* Sandbox Warning Banner */}
      {environment === 'sandbox' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-3 sm:px-6 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 truncate">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate font-medium text-[11px] sm:text-xs">SANDBOX ACTIVE — Simulated environment.</span>
          </div>
          <button
            onClick={() => onEnvironmentToggle('live')}
            className="text-[11px] sm:text-xs font-bold text-amber-900 dark:text-amber-300 hover:underline cursor-pointer shrink-0 ml-2"
          >
            Switch Live
          </button>
        </div>
      )}

      <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2 min-w-0">
        {/* Left Title & Mobile Menu Trigger */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg fast-transition cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate leading-tight">
            {activeTabTitle}
          </h2>

          <span className="hidden md:inline-block text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono shrink-0">
            {businessSettings.merchant_id}
          </span>
        </div>

        {/* Right Tools (Theme Toggle, Environment Switcher, Notifications, User Avatar & Logout) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Dark Mode Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode (Logo Palette)'}
              className="p-2 rounded-lg bg-slate-100 dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 fast-transition cursor-pointer flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          )}

          {/* Environment Switcher Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1c1c20] p-0.5 sm:p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-semibold">
            <button
              onClick={() => onEnvironmentToggle('live')}
              className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-md fast-transition cursor-pointer ${
                environment === 'live'
                  ? 'bg-white dark:bg-[#fed700] text-slate-900 dark:text-slate-950 shadow-xs border border-slate-200 dark:border-amber-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Live
            </button>
            <button
              onClick={() => onEnvironmentToggle('sandbox')}
              className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-md fast-transition cursor-pointer ${
                environment === 'sandbox'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sandbox
            </button>
          </div>

          {/* Notification Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative fast-transition cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#1c1c20] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#141416] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 pl-1.5 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-xs">
              SJ
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Sarah Jenkins</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{userRole} · {businessSettings.business_name}</p>
            </div>
            <button
              onClick={onLogout}
              title="Logout session"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg fast-transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
