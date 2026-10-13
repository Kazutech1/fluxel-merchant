'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Code2,
  Home,
  Link2,
  List,
  Lock,
  LogOut,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';

import { toggleTheme, useTheme } from '../../lib/theme';
import { clearCache } from '../../lib/console/client';
import { useDisputes } from '../../lib/console/data';
import type { Txn } from '../../lib/console/models';
import { ROLE_LABEL, isRole } from '../../lib/permissions';
import type { AuthBusiness, AuthSession } from '../../types/auth';
import { cx } from './ui';
import { PAGE_LABELS, isPage, type Page, type PageProps } from './nav';
import CommandPalette from './CommandPalette';
import OverviewPage from './OverviewPage';
import TransactionsPage from './TransactionsPage';
import CustomersPage from './CustomersPage';
import PaymentLinksPage from './PaymentLinksPage';
import RefundsPage from './RefundsPage';
import DisputesPage from './DisputesPage';
import ReportsPage from './ReportsPage';
import DevelopersPage from './DevelopersPage';
import SettingsPage from './SettingsPage';
import WithdrawModal from './WithdrawModal';
import TransactionDrawer from './TransactionDrawer';

type Icon = React.ComponentType<{ className?: string }>;

const NAV: { label?: string; items: { id: Page; label: string; icon: Icon }[] }[] = [
  { items: [{ id: 'overview', label: 'Overview', icon: Home }] },
  {
    label: 'Payments',
    items: [
      { id: 'transactions', label: 'Transactions', icon: List },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'links', label: 'Payment links', icon: Link2 },
    ],
  },
  {
    label: 'Money out',
    items: [
      { id: 'refunds', label: 'Refunds', icon: RotateCcw },
      { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'developers', label: 'Developers', icon: Code2 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const GROUP_LABEL = 'px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500';

/** The sign-in page's brand-panel grid, reused as the sidebar's texture. */
const GRID_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
  backgroundSize: '56px 56px',
  maskImage: 'radial-gradient(ellipse 120% 40% at 0% 0%, #000, transparent 75%)',
  WebkitMaskImage: 'radial-gradient(ellipse 120% 40% at 0% 0%, #000, transparent 75%)',
};

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

export interface ConsoleProps {
  session: AuthSession;
  onLogout: () => void;
}

function parseHash(): { page: Page; sub: string | null } {
  const [p, ...rest] = window.location.hash.slice(1).split('/');
  if (p === 'team') return { page: 'settings', sub: 'team' };
  if (p === 'withdrawals') return { page: 'settings', sub: 'payouts' };
  return isPage(p) ? { page: p, sub: rest.join('/') || null } : { page: 'overview', sub: null };
}

export default function Console({ session, onLogout }: ConsoleProps) {
  const theme = useTheme();
  const [business, setBusiness] = useState<AuthBusiness>(session.business);
  const [route, setRoute] = useState<{ page: Page; sub: string | null }>({ page: 'overview', sub: null });
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [openTxn, setOpenTxn] = useState<Txn | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Live once the business is KYB-approved (`tier_1`); a sandbox account until then.
  const live = business.tier_1;
  const inReview = business.status === 'kyb_pending';

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 4000);
  }, []);

  const navigate = useCallback((page: Page, sub?: string) => {
    const samePage = window.location.hash.slice(1).split('/')[0] === page;
    window.location.hash = sub ? `${page}/${sub}` : page;
    setRoute({ page, sub: sub ?? null });
    setNavOpen(false);
    setOpenTxn(null);
    if (!samePage) window.scrollTo({ top: 0 });
  }, []);

  // The page lives in the URL hash so a refresh or shared link lands in the same place, drawers included.
  useEffect(() => {
    const sync = () => setRoute(parseHash());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // The tab title follows the page: "Transactions · Fluxel".
  useEffect(() => {
    document.title = `${PAGE_LABELS[route.page]} · Fluxel`;
  }, [route.page]);

  // ⌘K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const role = session.user.roles[0] ?? '';
  const disputes = useDisputes();
  const badges: Partial<Record<Page, number>> = {
    disputes: (disputes.data ?? []).filter((d) => d.status === 'open' || d.status === 'under_review').length,
  };

  const pageProps: PageProps = {
    role,
    userEmail: session.user.email,
    business,
    onBusinessUpdated: setBusiness,
    sub: route.sub,
    notify,
    onNavigate: navigate,
    onOpenTxn: setOpenTxn,
    onWithdraw: () => setWithdrawing(true),
  };

  const signOut = () => {
    clearCache();
    onLogout();
  };

  const navItem = ({ id, label, icon: ItemIcon }: { id: Page; label: string; icon: Icon }) => {
    const active = route.page === id;
    const badge = badges[id];
    return (
      <a
        key={id}
        href={`#${id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(id);
        }}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'relative flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors',
          active ? 'bg-white/[0.08] text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
        )}
      >
        {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand" />}
        <ItemIcon className={cx('size-[17px]', active && 'text-brand')} />
        <span className="flex-1">{label}</span>
        {badge ? (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-brand-ink text-[11px] font-bold inline-flex items-center justify-center">{badge}</span>
        ) : null}
      </a>
    );
  };

  const sidebar = (
    <div className="relative h-full w-[248px] bg-[#0a0a0b] text-white flex flex-col overflow-hidden border-r border-white/[0.06]">
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={GRID_STYLE} />
      <div aria-hidden className="absolute -top-24 -left-16 size-64 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative h-16 shrink-0 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fluxel_logo.png" alt="" className="size-8 rounded-lg object-cover ring-1 ring-brand/30" />
          <span className="text-[15px] font-semibold tracking-tight">
            Fluxel <span className="text-brand font-normal">Payments</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label="Close menu"
          className="lg:hidden -mr-2 size-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate('settings')}
        className="relative mx-3 mt-1 mb-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-left hover:border-brand/40 transition-colors cursor-pointer"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{business.name}</span>
          <span className={cx('text-[10px] font-semibold uppercase tracking-wider', live ? 'text-emerald-400' : 'text-brand')}>
            {live ? 'Live' : 'Sandbox'}
          </span>
        </span>
        <span className="block mt-0.5 text-[11px] font-mono text-slate-500 truncate">{business.id}</span>
      </button>

      <nav className="relative flex-1 min-h-0 flex flex-col" aria-label="Main">
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3">
          {NAV.slice(0, -1).map((group, gi) => (
            <div key={gi} className={gi ? 'mt-4' : ''}>
              {group.label && <p className={GROUP_LABEL}>{group.label}</p>}
              <div className="space-y-0.5">{group.items.map(navItem)}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0 px-3 pt-3 pb-3 border-t border-white/10">
          <p className={GROUP_LABEL}>{NAV[NAV.length - 1].label}</p>
          <div className="space-y-0.5">{NAV[NAV.length - 1].items.map(navItem)}</div>
        </div>
      </nav>

      <div className="relative shrink-0 px-3 pb-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <span className="size-8 shrink-0 rounded-full bg-brand text-brand-ink text-xs font-bold inline-flex items-center justify-center">
            {session.user.email.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" title={session.user.email}>
              {session.user.email}
            </p>
            <p className="text-xs text-slate-500 truncate">{isRole(role) ? ROLE_LABEL[role] : role || 'Member'}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleTheme(theme)}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="size-8 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-brand hover:bg-white/[0.06] cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="size-8 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-brand hover:bg-white/[0.06] cursor-pointer"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh bg-canvas text-ink lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden lg:block sticky top-0 h-svh">{sidebar}</aside>

      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 fx-fade-in" onClick={() => setNavOpen(false)} />
          <div className="relative h-full fx-slide-in">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex flex-col">
        <div className="sticky top-0 z-30 h-16 px-4 sm:px-8 flex items-center justify-between gap-3 bg-canvas/85 backdrop-blur border-b border-line">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="lg:hidden -ml-2 size-10 shrink-0 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-subtle cursor-pointer"
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 h-9 w-full max-w-xs px-3 rounded-lg border border-line bg-surface text-sm text-ink-3 hover:border-line-strong cursor-pointer"
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 text-left truncate">Search…</span>
              <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center rounded border border-line text-[10px] font-mono">⌘K</kbd>
            </button>
          </div>

          {live ? (
            <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-line bg-surface text-[13px] font-medium text-ink">
              <span aria-hidden className="size-1.5 rounded-full bg-positive" />
              Live
            </span>
          ) : (
            <button
              type="button"
              onClick={() => navigate('settings', 'verification')}
              title={inReview ? 'Verification is being reviewed' : 'Verify your business to accept live payments'}
              className="inline-flex items-center gap-2 h-8 pl-3 pr-1 rounded-full bg-brand text-brand-ink text-[13px] font-medium hover:bg-brand-strong cursor-pointer"
            >
              Sandbox
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-brand-ink/10 text-xs">
                {inReview ? 'In review' : (
                  <>
                    <Lock className="size-3" /> Go live
                  </>
                )}
              </span>
            </button>
          )}
        </div>

        {!live && (
          <div className="sticky top-16 z-20 px-4 sm:px-8 py-2 bg-gold-soft border-b border-brand/40 text-sm">
            <span className="font-semibold text-gold">Sandbox account.</span>{' '}
            <span className="text-ink-2">
              {inReview ? 'Your verification is in review — live payments unlock when it’s approved.' : 'Live payments unlock once your business is verified.'}
            </span>
          </div>
        )}

        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
          {route.page === 'overview' && <OverviewPage {...pageProps} />}
          {route.page === 'transactions' && <TransactionsPage {...pageProps} />}
          {route.page === 'customers' && <CustomersPage {...pageProps} />}
          {route.page === 'links' && <PaymentLinksPage {...pageProps} />}
          {route.page === 'refunds' && <RefundsPage />}
          {route.page === 'disputes' && <DisputesPage {...pageProps} />}
          {route.page === 'reports' && <ReportsPage {...pageProps} />}
          {route.page === 'developers' && <DevelopersPage {...pageProps} />}
          {route.page === 'settings' && <SettingsPage {...pageProps} />}
        </main>
      </div>

      <WithdrawModal
        open={withdrawing}
       
        businessName={business.name}
        notify={notify}
        onClose={() => setWithdrawing(false)}
        onManageAccounts={() => {
          setWithdrawing(false);
          navigate('settings', 'payouts');
        }}
      />

      <TransactionDrawer txn={openTxn} role={role} onClose={() => setOpenTxn(null)} onNavigate={navigate} notify={notify} />

      <CommandPalette
        open={searchOpen}
       
        role={role}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
        onOpenTxn={setOpenTxn}
        onWithdraw={() => setWithdrawing(true)}
      />

      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col items-end gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : undefined}
            className={cx(
              'fx-toast-in pointer-events-auto flex items-start gap-2.5 max-w-sm rounded-lg bg-[#0a0a0b] text-white text-sm px-4 py-3 shadow-xl border',
              t.tone === 'error' ? 'border-negative/50' : 'border-brand/25'
            )}
          >
            {t.tone === 'error' ? (
              <AlertCircle className="size-4 mt-0.5 text-negative shrink-0" />
            ) : (
              <CheckCircle2 className="size-4 mt-0.5 text-brand shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
