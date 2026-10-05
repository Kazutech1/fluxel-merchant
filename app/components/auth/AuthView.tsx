'use client';

import React, { memo, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { AuthRequestError, login, register } from '../../lib/auth';
import type { AuthSession } from '../../types/auth';

interface AuthViewProps {
  onAuthenticated: (session: AuthSession) => void;
  /** Opens the console with simulated data, no account needed. */
  onExploreDemo?: () => void;
}

const CAPABILITIES = [
  { term: 'Collections', detail: 'Dynamic NGN virtual accounts that expire in 30 minutes.' },
  { term: 'Payouts', detail: 'USDT on TRON and fiat to any Nigerian bank, same balance.' },
  { term: 'Ledger', detail: 'Double-entry postings with signed, replayable webhooks.' },
];

/** `POST /v1/dashboard/auth/register` rejects anything shorter. */
const MIN_PASSWORD_LENGTH = 8;

/** The API's messages are already user-facing; they just aren't capitalised. */
function sentenceCase(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1);
}

/**
 * The brand panel's grid is a full-height masked compositing layer. Hoisted to
 * a module constant and memoised so that typing in the form — which re-renders
 * AuthView on every keystroke — never reconciles or repaints it.
 */
const BRAND_GRID_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
  backgroundSize: '56px 56px',
  maskImage: 'radial-gradient(ellipse 80% 60% at 30% 20%, #000, transparent 75%)',
  WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 30% 20%, #000, transparent 75%)',
};

const BrandPanel = memo(function BrandPanel() {
  return (
    // Desktop only — mobile goes straight to the form. The dark surface is
    // fixed brand styling, not the dark theme.
    <aside className="hidden lg:flex flex-col justify-between bg-[#0a0a0b] text-white p-12 xl:p-16 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={BRAND_GRID_STYLE}
      />

      <div className="relative flex items-center gap-3">
        <img src="/fluxel_logo.png" alt="" className="w-9 h-9 rounded-lg object-cover" />
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
            <div
              key={term}
              className="grid grid-cols-[7.5rem_1fr] gap-6 py-4 border-b border-white/10"
            >
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
  );
});

export default function AuthView({ onAuthenticated, onExploreDemo }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isLogin = authMode === 'login';

  // The console is themeable; sign-in is light only. Drop the dark class for
  // as long as this view is mounted — that also covers the scrollbars and the
  // body background, which are styled from `.dark` in globals.css rather than
  // from utility classes — and hand it back on the way out so the dashboard
  // opens in whatever theme the user had chosen.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => {
      if (wasDark) root.classList.add('dark');
    };
  }, []);

  const switchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedBusiness = businessName.trim();

    if (!trimmedEmail || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (!isLogin && !trimmedBusiness) {
      setError('Enter your registered business name.');
      return;
    }
    if (!isLogin && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      const session = isLogin
        ? await login(trimmedEmail, password, rememberMe)
        : await register(trimmedEmail, password, trimmedBusiness, rememberMe);
      // Deliberately still submitting: this view unmounts on success, and
      // clearing the flag first would flash an enabled button on the way out.
      onAuthenticated(session);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof AuthRequestError
          ? sentenceCase(err.message)
          : 'Something went wrong. Try again.'
      );
    }
  };

  const inputClass =
    'w-full h-12 px-3.5 rounded-lg bg-white border border-slate-300 ' +
    'text-base sm:text-sm text-slate-900 placeholder:text-slate-400 ' +
    'outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 ' +
    'disabled:bg-slate-50 disabled:text-slate-500 transition-colors';

  const labelClass = 'block text-sm font-medium text-slate-700 mb-2';

  return (
    <div className="min-h-svh bg-white text-slate-900 lg:grid lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.25fr_1fr]">
      <BrandPanel />

      {/* -------------------------------------------------- */}
      {/* Auth form */}
      {/* -------------------------------------------------- */}
      <main className="min-h-svh flex flex-col px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12 lg:py-10">
        <div className="flex items-center gap-2.5 lg:invisible">
          <img src="/fluxel_logo.png" alt="" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-[15px] font-semibold tracking-tight">
            Fluxel <span className="text-slate-400 font-normal">Payments</span>
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center py-10 lg:py-0">
          <div className="w-full max-w-[26rem] mx-auto">
            <header className="mb-8">
              <h2 className="text-[1.75rem] sm:text-3xl font-semibold tracking-tight">
                {isLogin ? 'Sign in' : 'Create your account'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {isLogin
                  ? 'Use your merchant work email.'
                  : 'Register your business to start in sandbox. Live access unlocks once KYB is approved.'}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {!isLogin && (
                <div>
                  <label htmlFor="business" className={labelClass}>
                    Registered business name
                  </label>
                  <input
                    id="business"
                    // Deliberately not `name="organization"` /
                    // `autoComplete="organization"`. Those two tokens make
                    // Chromium classify this whole form as an *address* form,
                    // which swaps the password-manager dropdown for the
                    // address-suggestion popup — and that popup renders in the
                    // browser process, where a crash closes all of Brave rather
                    // than just the tab. A business name is entered once at
                    // registration, so there is nothing worth autofilling here.
                    name="business-name"
                    type="text"
                    autoComplete="off"
                    disabled={submitting}
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
                  disabled={submitting}
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
                        // No reset endpoint exists yet — promising an email is
                        // a lie the user would sit and wait on.
                        setNotice(
                          'Self-service password reset is not available yet — ask your Fluxel contact to reset it.'
                        );
                      }}
                      className="text-sm text-slate-500 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 cursor-pointer"
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
                    disabled={submitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {!isLogin && (
                  <p className="mt-2 text-xs text-slate-500">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3 py-1 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={submitting}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900/20"
                />
                <span className="text-sm text-slate-600">Keep me signed in on this device</span>
              </label>

              {(error || notice) && (
                <p
                  role="alert"
                  className={error ? 'text-sm text-rose-600' : 'text-sm text-slate-600'}
                >
                  {error || notice}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 disabled:hover:bg-slate-900 disabled:active:scale-100 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {submitting
                  ? isLogin
                    ? 'Signing in…'
                    : 'Creating account…'
                  : isLogin
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              {isLogin ? 'No account yet?' : 'Already registered?'}{' '}
              <button
                type="button"
                disabled={submitting}
                onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                className="font-medium text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 disabled:opacity-60 cursor-pointer"
              >
                {isLogin ? 'Register a business' : 'Sign in'}
              </button>
            </p>

            {onExploreDemo && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onExploreDemo}
                  className="w-full h-12 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 transition cursor-pointer"
                >
                  Explore the demo dashboard
                </button>
                <p className="mt-2 text-xs text-slate-500 text-center">
                  Simulated balances, customers and payouts. Nothing real moves.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center lg:hidden">
          &copy; {new Date().getFullYear()} Fluxel Technology Solutions
        </p>
      </main>
    </div>
  );
}
