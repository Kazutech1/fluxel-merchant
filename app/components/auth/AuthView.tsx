'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Sparkles,
  Building2,
  CheckCircle2,
  Sun,
  Moon,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Check,
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (userRole: string, tokenType: 'dash' | 'admin') => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function AuthView({ onLoginSuccess, theme = 'dark', onToggleTheme }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');

  // Form fields
  const [email, setEmail] = useState('sarah.jenkins@acmefintech.io');
  const [password, setPassword] = useState('••••••••••••');
  const [businessName, setBusinessName] = useState('Acme Fintech Solutions');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setStep('totp');
  };

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      setError('Please enter a valid 6-digit TOTP code (e.g. 123456).');
      return;
    }
    setError('');
    onLoginSuccess('Owner', 'dash');
  };

  const handleQuickLogin = (role: string, demoEmail: string) => {
    setEmail(demoEmail);
    onLoginSuccess(role, 'dash');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d0d0d] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-amber-500/20 selection:text-amber-400 fast-transition">
      {/* ---------------------------------------------------- */}
      {/* LEFT COLUMN: Visual Showcase / Image & Hero Section (Desktop Mode) */}
      {/* ---------------------------------------------------- */}
      <div className="lg:w-[55%] xl:w-[58%] bg-[#0a0a0c] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 dark:border-[#222226]">
        {/* Glowing Background Elements derived from Logo Gold */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#fed700]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-[#fed700]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src="/fluxel_logo.png"
                alt="Fluxel Platform Logo"
                className="w-11 h-11 rounded-xl object-cover border border-[#fed700]/40 shadow-lg gold-glow"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0a0c] rounded-full"></span>
            </div>
            <div>
              <span className="text-xl font-black tracking-wider text-white flex items-center gap-1.5 leading-none">
                FLUXEL <span className="text-[#fed700]">PAYMENTS</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-widest uppercase block mt-1">
                Merchant Infrastructure Rail
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-[#fed700]/30 text-xs text-amber-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API SLA: 99.99% Operational</span>
          </div>
        </div>

        {/* Hero Visual Card & Showcase */}
        <div className="relative z-10 my-10 lg:my-auto space-y-8 max-w-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fed700]/10 border border-[#fed700]/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Asset Merchant Core</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Unified Fiat & Crypto Settlement Engine.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              Automate dynamic NGN virtual account generation, instant USDT liquidity payouts, and double-entry ledger audits with sub-150ms webhook dispatch.
            </p>
          </div>

          {/* Interactive Live Rails Visual Card */}
          <div className="bg-[#141416]/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl gold-border-glow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-mono">
                <Activity className="w-4 h-4 text-[#fed700]" />
                <span className="font-bold text-white">LIVE LEDGER STREAM</span>
              </div>
              <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-mono">
                Lenco MFB & TRON Rail
              </span>
            </div>

            {/* Mock Live Stream Items */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#1a1a1e] border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    NGN
                  </div>
                  <div>
                    <div className="text-white font-bold text-xs">fdi_99A101 · Amina Bello</div>
                    <div className="text-[10px] text-slate-400">Dynamic VA: 8091442901 (Lenco MFB)</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">+₦50,000.00</div>
                  <div className="text-[10px] text-slate-400">200 OK ACK (42ms)</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1a1a1e] border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[#fed700] flex items-center justify-center font-bold">
                    USDT
                  </div>
                  <div>
                    <div className="text-white font-bold text-xs">txn_0089AB · Internal Transfer</div>
                    <div className="text-[10px] text-slate-400">TRON TRX20 · Double Entry Posted</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#fed700] font-bold">+2,500.00 USDT</div>
                  <div className="text-[10px] text-slate-400">Ledger Balanced</div>
                </div>
              </div>
            </div>

            {/* Key Value Prop Feature Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#fed700]" />
                <span>30-Min Dynamic VAs</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#fed700]" />
                <span>TOTP Step-Up MFA</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#fed700]" />
                <span>Signed Webhooks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info in Hero panel */}
        <div className="relative z-10 pt-4 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60">
          <span>&copy; {new Date().getFullYear()} Fluxel Technology Solutions.</span>
          <span className="font-mono text-[11px] text-slate-400">ADR-021 Merchant Spec v2.4</span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* RIGHT COLUMN: Authentication Form Section */}
      {/* ---------------------------------------------------- */}
      <div className="lg:w-[45%] xl:w-[42%] bg-white dark:bg-[#0d0d0d] p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative fast-transition">
        {/* Top Header Row with Theme Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src="/fluxel_logo.png"
              alt="Fluxel Logo"
              className="w-8 h-8 rounded-lg object-cover border border-slate-300 dark:border-amber-500/40"
            />
            <span className="font-extrabold text-base tracking-wider text-slate-900 dark:text-white">
              FLUXEL
            </span>
          </div>

          <div className="hidden lg:block">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Merchant Authentication Portal
            </span>
          </div>

          {/* Theme Toggle Control */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Mode (Logo Palette)'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#2a2a30] text-xs font-semibold text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-[#222228] fast-transition cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Card Container */}
        <div className="my-auto max-w-md w-full mx-auto space-y-6">
          {/* Mode Tabs: Sign In vs Create Account */}
          <div className="flex items-center bg-slate-100 dark:bg-[#141416] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => {
                setAuthMode('login');
                setStep('credentials');
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-lg fast-transition cursor-pointer text-center ${
                authMode === 'login'
                  ? 'bg-white dark:bg-[#fed700] text-slate-900 dark:text-slate-950 shadow-xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setStep('credentials');
                setError('');
              }}
              className={`flex-1 py-2.5 rounded-lg fast-transition cursor-pointer text-center ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-[#fed700] text-slate-900 dark:text-slate-950 shadow-xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Business Account
            </button>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Registered Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Acme Fintech Ltd"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#141416] border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] focus:bg-white dark:focus:bg-[#18181b] outline-none fast-transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Merchant Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.jenkins@acmefintech.io"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#141416] border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] focus:bg-white dark:focus:bg-[#18181b] outline-none fast-transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setError('Password reset instructions sent to your email.')}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#141416] border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] focus:bg-white dark:focus:bg-[#18181b] outline-none fast-transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-400 dark:bg-[#141416]"
                  />
                  <span>Remember this browser session</span>
                </label>
              </div>

              {error && (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 dark:bg-[#fed700] hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-2 fast-transition cursor-pointer"
              >
                <span>{authMode === 'login' ? 'Sign In & Verify TOTP' : 'Create Account & Begin KYB'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center space-y-1.5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">MFA Authenticator Step-Up</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter 6-digit code from your authenticator app (e.g. 123456)
                </p>
              </div>

              <div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#141416] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono tracking-widest text-xl font-bold text-center focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] outline-none"
                    autoFocus
                  />
                </div>
                {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{error}</p>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  &larr; Back
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 dark:bg-[#fed700] hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg cursor-pointer"
                >
                  Verify & Enter Dashboard
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Login Presets */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-center">
              Quick Demo One-Click Logins
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('Owner', 'sarah.jenkins@acmefintech.io')}
                className="p-3 bg-slate-50 dark:bg-[#141416] hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40 rounded-xl text-left text-xs fast-transition cursor-pointer"
              >
                <span className="font-bold text-slate-900 dark:text-white block">Merchant Owner</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">sarah@acmefintech.io</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Developer', 'm.chen@acmefintech.io')}
                className="p-3 bg-slate-50 dark:bg-[#141416] hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40 rounded-xl text-left text-xs fast-transition cursor-pointer"
              >
                <span className="font-bold text-slate-900 dark:text-white block">Developer</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">m.chen@acmefintech.io</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile bottom info */}
        <div className="pt-6 text-center lg:hidden">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Fluxel Platform · Secure AES-256 Encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
