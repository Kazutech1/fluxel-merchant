'use client';

import React, { useState } from 'react';
import { BusinessSettings } from '../../types/dashboard';
import { Settings, Building2, Sliders, Mail, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettlementPreference: (pref: 'accumulate' | 'auto_transfer') => void;
  onUpdateNotificationEmails: (notificationEmail: string, webhookEmail: string) => void;
}

export default function SettingsView({
  settings,
  onUpdateSettlementPreference,
  onUpdateNotificationEmails,
}: SettingsViewProps) {
  const [pref, setPref] = useState(settings.settlement_preference);
  const [notifEmail, setNotifEmail] = useState(settings.notification_email);
  const [webEmail, setWebEmail] = useState(settings.webhook_email);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePref = (newPref: 'accumulate' | 'auto_transfer') => {
    setPref(newPref);
    onUpdateSettlementPreference(newPref);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveEmails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNotificationEmails(notifEmail, webEmail);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 max-w-3xl mx-auto">
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Card 1: Settlement Preference (ADR-025) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Settlement Preference (ADR-025)</h3>
            <p className="text-xs text-slate-500 font-medium">Control whether incoming fiat/crypto deposits accumulate in float or auto-transfer</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSavePref('accumulate')}
            className={`p-4 rounded-xl border text-left space-y-2 fast-transition cursor-pointer ${
              pref === 'accumulate'
                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">Option 1: Accumulate</span>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Hold settled deposit funds in your Fluxel business float balance for manual payout distributions.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSavePref('auto_transfer')}
            className={`p-4 rounded-xl border text-left space-y-2 fast-transition cursor-pointer ${
              pref === 'auto_transfer'
                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">Option 2: Auto-Transfer</span>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Automatically trigger daily batch transfer of settled balances directly to your verified corporate bank account.
            </p>
          </button>
        </div>
      </div>

      {/* Card 2: Lenco Static Top-Up Account (ADR-024) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Permanent Business Float Account (ADR-024)</h3>
            <p className="text-xs text-slate-500 font-medium">Lenco static virtual account assigned upon business KYB approval</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 font-mono text-xs text-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 uppercase font-bold">Bank Name:</span>
            <span className="font-bold text-slate-900">{settings.static_bank_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 uppercase font-bold">Account Number:</span>
            <span className="font-bold text-indigo-600 text-sm">{settings.static_account_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 uppercase font-bold">Account Name:</span>
            <span className="font-bold text-slate-900">{settings.static_account_name}</span>
          </div>
        </div>
      </div>

      {/* Card 3: Notification Recipients */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <Mail className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Notification Recipients</h3>
            <p className="text-xs text-slate-500 font-medium">Configure email alerts for system events and failed webhooks</p>
          </div>
        </div>

        <form onSubmit={handleSaveEmails} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Financial Notification Email
            </label>
            <input
              type="email"
              required
              value={notifEmail}
              onChange={(e) => setNotifEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Developer Webhook Alert Email
            </label>
            <input
              type="email"
              required
              value={webEmail}
              onChange={(e) => setWebEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Save Email Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
