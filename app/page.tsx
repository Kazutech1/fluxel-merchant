'use client';

import React, { useState, useMemo } from 'react';
import AuthView from './components/auth/AuthView';
import Sidebar, { TabType } from './components/common/Sidebar';
import Header from './components/common/Header';
import OverviewView from './components/dashboard/OverviewView';
import CustomersView from './components/dashboard/CustomersView';
import TransactionsView from './components/dashboard/TransactionsView';
import PayoutsView from './components/dashboard/PayoutsView';
import TransfersView from './components/dashboard/TransfersView';
import DevelopersView from './components/dashboard/DevelopersView';
import TeamView from './components/dashboard/TeamView';
import SettingsView from './components/dashboard/SettingsView';
import StepUpTotpModal from './components/common/StepUpTotpModal';
import RevealKeyModal from './components/common/RevealKeyModal';
import TestFireWebhookModal from './components/common/TestFireWebhookModal';
import QrCodeModal from './components/common/QrCodeModal';
import PaymentLinkModal from './components/common/PaymentLinkModal';

import {
  ALL_ASSETS,
  PaymentSession,
  RAILS,
  createSession,
  toMinorUnits,
  upsertSession,
  useSessions,
} from './lib/paymentSessions';
import AssetIcon from './components/common/AssetIcon';
import {
  sessionToIntent,
  sessionToTransaction,
  sortByCreatedDesc,
} from './lib/sessionAdapters';
import { toggleTheme, useTheme } from './lib/theme';

import {
  initialBalances,
  initialCustomers,
  initialDepositIntents,
  initialTransactions,
  initialApiKeys,
  initialWebhookEndpoints,
  initialWebhookDeliveries,
  initialTeamMembers,
  initialUserSessions,
  initialBusinessSettings,
} from './mock/dashboardData';

import {
  Environment,
  AssetCode,
  Customer,
  DepositIntent,
  Transaction,
  ApiKey,
  WebhookEndpoint,
  WebhookDelivery,
  TeamMember,
  UserSession,
  BusinessSettings,
} from './types/dashboard';

import { CheckCircle2, X, QrCode, Building2 } from 'lucide-react';

export default function App() {
  // Theme lives in an external store (see lib/theme.ts) so the /pay route —
  // a separate React tree — reads the same value, and the class is already on
  // <html> before first paint via the bootstrap script in layout.tsx.
  const theme = useTheme();
  const toggleThemeHandler = () => toggleTheme(theme);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('Owner');
  const [tokenType, setTokenType] = useState<'dash' | 'admin'>('dash');

  // Navigation & Env
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [environment, setEnvironment] = useState<Environment>('live');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Interactive State
  const [balances, setBalances] = useState(initialBalances);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [intents, setIntents] = useState<DepositIntent[]>(initialDepositIntents);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(initialWebhookEndpoints);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(initialWebhookDeliveries);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [sessions, setSessions] = useState<UserSession[]>(initialUserSessions);
  const [settings, setSettings] = useState<BusinessSettings>(initialBusinessSettings);

  // Modals & Feedback
  const [toast, setToast] = useState<string | null>(null);
  const [showCreateIntentModal, setShowCreateIntentModal] = useState(false);
  const [intentCustomer, setIntentCustomer] = useState(customers[0]?.id || '');
  const [intentAmount, setIntentAmount] = useState('50000');
  const [intentDescription, setIntentDescription] = useState('Marketplace order settlement');
  // An intent collects exactly one asset — naira for naira, crypto for crypto.
  const [intentAsset, setIntentAsset] = useState<AssetCode>('NGN');

  // Created Intent QR Modal State
  const [intentQrData, setIntentQrData] = useState<{ title: string; subtitle: string; payload: string } | null>(null);

  // Hosted-checkout payment requests. Lives in localStorage so the /pay route —
  // a separate React tree, usually a separate tab — writes back here live.
  const checkoutSessions = useSessions();
  const [createdLink, setCreatedLink] = useState<PaymentSession | null>(null);

  const allIntents = useMemo(
    () => sortByCreatedDesc([...Object.values(checkoutSessions).map(sessionToIntent), ...intents]),
    [checkoutSessions, intents]
  );

  const allTransactions = useMemo(() => {
    const fromCheckout = Object.values(checkoutSessions)
      .map(sessionToTransaction)
      .filter((t): t is Transaction => t !== null);
    return sortByCreatedDesc([...fromCheckout, ...transactions]);
  }, [checkoutSessions, transactions]);

  // Security Step-Up
  const [pendingStepUpAction, setPendingStepUpAction] = useState<(() => void) | null>(null);
  const [stepUpTitle, setStepUpTitle] = useState('');
  const [stepUpDescription, setStepUpDescription] = useState('');

  // Reveal Secret Key Modal
  const [revealKeyData, setRevealKeyData] = useState<{ name: string; key: string } | null>(null);

  // Test Fire Webhook Modal
  const [testWebhookTarget, setTestWebhookTarget] = useState<WebhookEndpoint | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLoginSuccess = (role: string, type: 'dash' | 'admin') => {
    setUserRole(role);
    setTokenType(type);
    setIsAuthenticated(true);
    showToast(`Logged in successfully (${type === 'dash' ? 'Merchant Portal' : 'Staff Console'} - JWT typ: "${type}")`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    showToast('Session logged out successfully');
  };

  const triggerStepUp = (title: string, description: string, action: () => void) => {
    setStepUpTitle(title);
    setStepUpDescription(description);
    setPendingStepUpAction(() => action);
  };

  const handleStepUpConfirm = (code: string) => {
    if (pendingStepUpAction) {
      pendingStepUpAction();
      setPendingStepUpAction(null);
    }
  };

  // 1. Create Deposit Intent — issues a hosted checkout link the customer can pay on.
  const createPaymentRequest = (
    customerId: string,
    amount: string,
    asset: AssetCode,
    description?: string
  ) => {
    const cust = customers.find((c) => c.id === customerId) || customers[0];

    const session = createSession({
      merchantName: settings.business_name,
      customerId: cust.id,
      customerName: cust.name,
      asset,
      expectedAmount: toMinorUnits(amount, asset),
      description,
    });

    upsertSession(session);
    setShowCreateIntentModal(false);
    setCreatedLink(session);
    showToast(`Payment request ${session.reference} created — share the link to collect`);
  };

  const handleCreateIntentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPaymentRequest(intentCustomer, intentAmount, intentAsset, intentDescription);
  };

  // 2. Manual Customer Balance Adjustment
  const handleManualBalanceAdjustment = (customerId: string, asset: AssetCode, amount: string, reason: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    setCustomers(
      customers.map((c) => {
        if (c.id === customerId) {
          const current = BigInt(c.balances[asset] || '0');
          const adj = BigInt(amount);
          const updated = (current + adj).toString();
          return {
            ...c,
            balances: { ...c.balances, [asset]: updated },
          };
        }
        return c;
      })
    );

    const newTxnId = `txn_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const newTxn: Transaction = {
      id: newTxnId,
      kind: 'deposit',
      asset_code: asset,
      amount: amount,
      status: 'completed',
      correlation_id: `fx_cor_${Math.random().toString(36).substring(2, 16)}`,
      customer_id: cust.id,
      customer_name: `${cust.name} (Manual Ledger Adjustment)`,
      created_at: new Date().toISOString(),
    };

    setTransactions([newTxn, ...transactions]);
    showToast(`Manual Ledger Adjustment posted for ${cust.name}. Audit note: "${reason}"`);
  };

  // 3. Initiate Payout
  const handleInitiatePayout = (payload: {
    type: 'fiat' | 'crypto';
    asset: AssetCode;
    amount: string;
    destination: string;
  }) => {
    triggerStepUp(
      `Confirm ${payload.type.toUpperCase()} Payout (${payload.asset})`,
      `You are initiating a funds transfer of ${payload.asset} to ${payload.destination}. Step-up TOTP verification required.`,
      () => {
        const newTxnId = `txn_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const newCorrelationId = `fx_cor_${Math.random().toString(36).substring(2, 16)}`;

        const newTxn: Transaction = {
          id: newTxnId,
          kind: payload.type === 'fiat' ? 'payout' : 'crypto_withdrawal',
          asset_code: payload.asset,
          amount: payload.amount,
          status: 'completed',
          correlation_id: newCorrelationId,
          destination: payload.destination,
          created_at: new Date().toISOString(),
          fee_breakdown: {
            gross_amount: payload.amount,
            network_fee: '25000',
            platform_fee: '50000',
            net_amount: payload.amount,
          },
        };

        setTransactions([newTxn, ...transactions]);
        showToast(`Payout ${newTxnId} executed successfully`);
      }
    );
  };

  // 4. Initiate Internal Transfer
  const handleInitiateTransfer = (senderId: string, recipientId: string, asset: AssetCode, amount: string) => {
    const sender = customers.find((c) => c.id === senderId);
    const recipient = customers.find((c) => c.id === recipientId);

    const newTxnId = `txn_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const newTxn: Transaction = {
      id: newTxnId,
      kind: 'internal_transfer',
      asset_code: asset,
      amount: amount,
      status: 'completed',
      correlation_id: `fx_cor_${Math.random().toString(36).substring(2, 16)}`,
      customer_name: `${sender?.name || senderId} -> ${recipient?.name || recipientId}`,
      created_at: new Date().toISOString(),
    };

    setTransactions([newTxn, ...transactions]);
    showToast(`Internal Transfer ${newTxnId} posted to double-entry ledger`);
  };

  // 5. Create API Key
  const handleCreateApiKey = (name: string, keyClass: 'pk' | 'sk') => {
    triggerStepUp(
      `Generate New ${keyClass.toUpperCase()} Bearer API Key`,
      `Generating a new API key requires step-up TOTP verification per Doc 8 security specifications.`,
      () => {
        const prefix = keyClass === 'sk' ? (environment === 'live' ? 'sk_live_' : 'sk_test_') : (environment === 'live' ? 'pk_live_' : 'pk_test_');
        const randomBody = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
        const fullKey = `${prefix}${randomBody}`;
        const last4 = fullKey.slice(-4);

        const newKey: ApiKey = {
          id: `key_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          name,
          class: keyClass,
          env: environment,
          prefix,
          last4,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          status: 'active',
          ip_allowlist: [],
        };

        setApiKeys([newKey, ...apiKeys]);
        setRevealKeyData({ name, key: fullKey });
      }
    );
  };

  // Render Auth Page if not logged in
  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleThemeHandler} />;
  }

  const tabTitles: Record<TabType, string> = {
    overview: 'Platform Overview',
    customers: 'Customer Directory & Identity',
    transactions: 'Double-Entry Transactions & Ledger',
    payouts: 'Payouts & Risk Queue Holds',
    transfers: 'Internal Marketplace Transfers',
    developers: 'Developer Portal & API Keys',
    team: 'Team Members & RBAC Permissions',
    settings: 'Business Profile & Settlement Settings',
  };

  const pendingReviewHolds = transactions.filter((t) => t.status === 'pending_review');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d0d0d] flex font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-amber-500/20 selection:text-amber-400">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white dark:bg-[#1c1c20] dark:border-amber-500/30 px-4 py-3 rounded-lg shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingReviewCount={pendingReviewHolds.length}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          environment={environment}
          onEnvironmentToggle={setEnvironment}
          businessSettings={settings}
          activeTabTitle={tabTitles[activeTab]}
          userRole={userRole}
          onLogout={handleLogout}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          theme={theme}
          onToggleTheme={toggleThemeHandler}
        />

        <main className="p-8 max-w-7xl w-full mx-auto flex-1">
          {activeTab === 'overview' && (
            <OverviewView
              balances={balances}
              recentTransactions={allTransactions}
              recentIntents={allIntents}
              businessSettings={settings}
              onNavigateTab={setActiveTab}
              onRequestCreateIntent={() => setShowCreateIntentModal(true)}
              onRequestPayout={() => setActiveTab('payouts')}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              transactions={allTransactions}
              intents={allIntents}
              onToggleCustomerFreeze={(id, reason) => {
                setCustomers(customers.map((c) => (c.id === id ? { ...c, status: c.status === 'active' ? 'frozen' : 'active' } : c)));
                showToast(`Customer status updated. Reason: "${reason}"`);
              }}
              onCreateCustomer={(name, email, extId) => {
                const newCus: Customer = {
                  id: `cus_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                  external_id: extId,
                  name,
                  email,
                  status: 'active',
                  kyc_tier: 'Tier 2 (Verified ID)',
                  bvn_tax_id: '22880011223',
                  risk_score: 10,
                  transaction_count: 0,
                  wallets: [
                    { chain: 'EVM (ETH/BSC)', address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` },
                    { chain: 'TRON', address: `T${Array.from({ length: 33 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}` },
                  ],
                  balances: { NGN: '0', USDT: '0', ETH: '0', BTC: '0' },
                  created_at: new Date().toISOString(),
                };
                setCustomers([newCus, ...customers]);
                showToast(`Customer ${name} provisioned`);
              }}
              onManualBalanceAdjustment={handleManualBalanceAdjustment}
              onIssueDepositIntent={(id, amt) => createPaymentRequest(id, amt, 'NGN')}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={allTransactions}
              businessName={settings.business_name}
              onQueryProviderStatus={(id) => showToast(`Live provider status queried for ${id}: HTTP 200 Settled`)}
              onReplayWebhook={(corId) => showToast(`Outbound webhook event replayed for ${corId}`)}
            />
          )}

          {activeTab === 'payouts' && (
            <PayoutsView
              pendingHolds={pendingReviewHolds}
              onInitiatePayout={handleInitiatePayout}
            />
          )}

          {activeTab === 'transfers' && (
            <TransfersView customers={customers} onInitiateTransfer={handleInitiateTransfer} />
          )}

          {activeTab === 'developers' && (
            <DevelopersView
              environment={environment}
              apiKeys={apiKeys}
              webhooks={webhooks}
              deliveries={deliveries}
              onCreateApiKey={handleCreateApiKey}
              onRevokeApiKey={(id) => setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)))}
              onRotateWebhookSecret={(id) => setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, secret: `whsec_${Math.random().toString(36).substring(2, 32)}` } : w)))}
              onRequestTestFireWebhook={(wh) => setTestWebhookTarget(wh)}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              teamMembers={teamMembers}
              sessions={sessions}
              onInviteMember={(name, email, role) => setTeamMembers([...teamMembers, { id: `usr_${Date.now()}`, name, email, role: role as any, status: 'invited', totp_enabled: false, last_active_at: 'Never' }])}
              onRevokeSession={(id) => setSessions(sessions.filter((s) => s.id !== id))}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettlementPreference={(pref) => setSettings({ ...settings, settlement_preference: pref })}
              onUpdateNotificationEmails={(nEmail, wEmail) => setSettings({ ...settings, notification_email: nEmail, webhook_email: wEmail })}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <StepUpTotpModal
        isOpen={Boolean(pendingStepUpAction)}
        title={stepUpTitle}
        description={stepUpDescription}
        onClose={() => setPendingStepUpAction(null)}
        onConfirm={handleStepUpConfirm}
      />

      <RevealKeyModal
        isOpen={Boolean(revealKeyData)}
        keyName={revealKeyData?.name || ''}
        plaintextKey={revealKeyData?.key || ''}
        onClose={() => setRevealKeyData(null)}
      />

      <TestFireWebhookModal
        isOpen={Boolean(testWebhookTarget)}
        endpoint={testWebhookTarget}
        onClose={() => setTestWebhookTarget(null)}
        onSendTest={() => showToast(`Test webhook fired to ${testWebhookTarget?.url}`)}
      />

      <QrCodeModal
        isOpen={Boolean(intentQrData)}
        title={intentQrData?.title || ''}
        subtitle={intentQrData?.subtitle || ''}
        qrPayload={intentQrData?.payload || ''}
        onClose={() => setIntentQrData(null)}
      />

      <PaymentLinkModal session={createdLink} onClose={() => setCreatedLink(null)} />

      {/* Create Dynamic Deposit Intent Modal Dialog */}
      {showCreateIntentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs fast-transition">
          <div className="bg-white dark:bg-[#141416] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowCreateIntentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 fast-transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-amber-500/10 border border-indigo-100 dark:border-amber-500/30 text-indigo-600 dark:text-[#fed700]">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Deposit Intent</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {intentAsset === 'NGN'
                    ? 'ADR-021 · 30-minute dynamic virtual account'
                    : `Flow 6 · dedicated ${intentAsset} address on ${RAILS[intentAsset].network}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateIntentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  What is the customer depositing?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_ASSETS.map((asset) => {
                    const active = asset === intentAsset;
                    return (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => setIntentAsset(asset)}
                        aria-pressed={active}
                        className={`min-h-11 px-1.5 rounded-lg border text-xs font-bold inline-flex items-center justify-center gap-1.5 fast-transition cursor-pointer ${
                          active
                            ? 'border-indigo-500 dark:border-[#fed700] bg-indigo-50 dark:bg-amber-500/10 text-indigo-700 dark:text-[#fed700]'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <AssetIcon code={asset} className="w-4 h-4" />
                        {asset}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  One asset per intent — the checkout collects only this rail.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Select Target Customer
                </label>
                <select
                  value={intentCustomer}
                  onChange={(e) => setIntentCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-medium outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  What is this for?
                </label>
                <input
                  type="text"
                  value={intentDescription}
                  onChange={(e) => setIntentDescription(e.target.value)}
                  placeholder="Marketplace order settlement"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Shown to the customer as the invoice line item.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Expected Deposit Amount ({intentAsset})
                </label>
                <div className="relative">
                  <input
                    // Decimal, not number: crypto amounts carry up to 18 places
                    // and are parsed digit-by-digit rather than through a float.
                    type="text"
                    inputMode="decimal"
                    required
                    value={intentAmount}
                    onChange={(e) => setIntentAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder={intentAsset === 'NGN' ? '50000' : '0.05'}
                    className="w-full pl-3 pr-16 py-2.5 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-bold outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">
                    {intentAsset}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateIntentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white dark:text-slate-950 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 rounded-lg shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Issue Intent & Display QR Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
