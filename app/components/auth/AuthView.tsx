'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import OtpInput from '../common/OtpInput';

interface AuthViewProps {
  onLoginSuccess: (userRole: string, tokenType: 'dash' | 'admin') => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const DEMO_ACCOUNTS = [
  { role: 'Owner', label: 'Merchant owner', email: 'sarah.jenkins@acmefintech.io' },
  { role: 'Developer', label: 'Developer', email: 'm.chen@acmefintech.io' },
];

const CAPABILITIES = [
  { term: 'Collections', detail: 'Dynamic NGN virtual accounts that expire in 30 minutes.' },
  { term: 'Payouts', detail: 'USDT on TRON and fiat to any Nigerian bank, same balance.' },
  { term: 'Ledger', detail: 'Double-entry postings with signed, replayable webhooks.' },
];

export default function AuthView({ onLoginSuccess, theme = 'dark', onToggleTheme }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');

  const [email, setEmail] = useState('sarah.jenkins@acmefintech.io');
  const [password, setPassword] = useState('fluxel-demo-2024');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('Acme Fintech Solutions');
  const [totpCode, setTotpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isLogin = authMode === 'login';

  const switchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setStep('credentials');
    setError('');
    setNotice('');
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setError('');
    setNotice('');
    setTotpCode('');
    setStep('totp');
  };

  const submitTotp = (code: string) => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError('');
    onLoginSuccess('Owner', 'dash');
  };

  // OtpInput sanitises to digits and fires onComplete on the last box, so this
  // only has to store the value and clear any stale error.
  const handleTotpChange = (value: string) => {
    setTotpCode(value);
    if (error) setError('');
  };

  const handleQuickLogin = (role: string, demoEmail: string) => {
    setEmail(demoEmail);
    onLoginSuccess(role, 'dash');
  };

  const inputClass =
    'w-full h-12 px-3.5 rounded-lg bg-white dark:bg-[#141416] border border-slate-300 dark:border-[#2a2a30] ' +
    'text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 ' +
    'outline-none focus:border-slate-900 dark:focus:border-[#fed700] focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-[#fed700]/20 ' +
    'transition-colors';

  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2';

  return (
    <div className="min-h-svh bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.25fr_1fr]">
      {/* -------------------------------------------------- */}
      {/* Brand panel — desktop only. Mobile goes straight to the form. */}
      {/* -------------------------------------------------- */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#0a0a0b] text-white p-12 xl:p-16 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 30% 20%, #000, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 30% 20%, #000, transparent 75%)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <img
            src="/fluxel_logo.png"
            alt=""
            className="w-9 h-9 rounded-lg object-cover"
          />
          <span className="text-[15px] font-semibold tracking-tight">
            Fluxel <span className="text-slate-500 font-normal">Payments</span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-4xl xl:text-[2.75rem] font-semibold tracking-tight leading-[1.1] text-white">
            Naira and stablecoins on one balance sheet.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
            The merchant console for Fluxel&apos;s settlement rail — collections, payouts, and
            reconciliation without running two treasuries.
          </p>

          <dl className="mt-12 border-t border-white/10">
            {CAPABILITIES.map(({ term, detail }) => (
              <div key={term} className="grid grid-cols-[7.5rem_1fr] gap-6 py-4 border-b border-white/10">
                <dt className="text-sm font-medium text-[#fed700]">{term}</dt>
                <dd className="text-sm text-slate-400 leading-relaxed">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center justify-between text-xs text-slate-600">
          <span>&copy; {new Date().getFullYear()} Fluxel Technology Solutions</span>
          <span className="font-mono">Merchant spec v2.4</span>
        </div>
      </aside>

      {/* -------------------------------------------------- */}
      {/* Auth form */}
      {/* -------------------------------------------------- */}
      <main className="min-h-svh flex flex-col px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:invisible">
            <img src="/fluxel_logo.png" alt="" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">
              Fluxel <span className="text-slate-400 dark:text-slate-500 font-normal">Payments</span>
            </span>
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18181b] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center py-10 lg:py-0">
          <div className="w-full max-w-[26rem] mx-auto">
            {step === 'credentials' ? (
              <>
                <header className="mb-8">
                  <h2 className="text-[1.75rem] sm:text-3xl font-semibold tracking-tight">
                    {isLogin ? 'Sign in' : 'Create your account'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isLogin
                      ? 'Use your merchant work email. You’ll confirm with your authenticator app.'
                      : 'Register your business to start KYB. Verification usually takes a day.'}
                  </p>
                </header>

                <form onSubmit={handleCredentialsSubmit} className="space-y-5" noValidate>
                  {!isLogin && (
                    <div>
                      <label htmlFor="business" className={labelClass}>
                        Registered business name
                      </label>
                      <input
                        id="business"
                        name="organization"
                        type="text"
                        autoComplete="organization"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Acme Fintech Ltd"
                        className={inputClass}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Work email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <label htmlFor="password" className={labelClass + ' mb-0'}>
                        Password
                      </label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setNotice('If that email is registered, reset instructions are on the way.');
                          }}
                          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 cursor-pointer"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={inputClass + ' pr-12'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 py-1 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 rounded border-slate-300 dark:border-slate-700 dark:bg-[#141416] text-slate-900 dark:text-[#fed700] focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-[#fed700]/30"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Keep me signed in on this device</span>
                  </label>

                  {(error || notice) && (
                    <p
                      role="alert"
                      className={
                        error
                          ? 'text-sm text-rose-600 dark:text-rose-400'
                          : 'text-sm text-slate-600 dark:text-slate-400'
                      }
                    >
                      {error || notice}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
                  >
                    {isLogin ? 'Continue' : 'Create account'}
                  </button>
                </form>

                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                  {isLogin ? 'No account yet?' : 'Already registered?'}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                    className="font-medium text-slate-900 dark:text-white underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-white cursor-pointer"
                  >
                    {isLogin ? 'Register a business' : 'Sign in'}
                  </button>
                </p>

                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-[#1e1e22]">
                  <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">Demo accounts</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DEMO_ACCOUNTS.map(({ role, label, email: demoEmail }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleQuickLogin(role, demoEmail)}
                        className="min-h-12 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-[#1e1e22] hover:border-slate-400 dark:hover:border-[#3a3a42] hover:bg-slate-50 dark:hover:bg-[#141416] text-left transition-colors cursor-pointer"
                      >
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-500 truncate">{demoEmail}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-150">
                <header className="mb-8">
                  <h2 className="text-[1.75rem] sm:text-3xl font-semibold tracking-tight">Two-factor code</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Open your authenticator app and enter the 6-digit code for{' '}
                    <span className="text-slate-900 dark:text-slate-200 break-all">{email}</span>.
                  </p>
                </header>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitTotp(totpCode);
                  }}
                  className="space-y-5"
                >
                  <OtpInput
                    label="6-digit authentication code"
                    value={totpCode}
                    onChange={handleTotpChange}
                    onComplete={submitTotp}
                    invalid={Boolean(error)}
                    autoFocus
                  />

                  {error && (
                    <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
                  >
                    Verify and continue
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setError('');
                    }}
                    className="w-full min-h-11 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-600 text-center lg:hidden">
          &copy; {new Date().getFullYear()} Fluxel Technology Solutions
        </p>
      </main>
    </div>
  );
}
