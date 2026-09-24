'use client';

import React, { useState } from 'react';
import { BadgeCheck, Clock, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';

import { BusinessRequestError, submitKyb } from '../../lib/business';
import type { AuthBusiness } from '../../types/auth';
import type { KybDetails } from '../../types/business';

interface KybPanelProps {
  business: AuthBusiness;
  onBusinessUpdated: (business: AuthBusiness) => void;
}

const BUSINESS_TYPES = [
  'Private Limited Company (Ltd)',
  'Business Name / Sole Proprietorship',
  'Incorporated Trustees',
  'Public Limited Company (PLC)',
  'Partnership',
];

const EMPTY: KybDetails = {
  legal_name: '',
  trading_name: '',
  rc_number: '',
  tax_id: '',
  business_type: BUSINESS_TYPES[0],
  registered_address: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  director_name: '',
  director_bvn: '',
};

/** Every field the backend will not validate for us — it stores `details` verbatim. */
const REQUIRED: (keyof KybDetails)[] = [
  'legal_name',
  'rc_number',
  'tax_id',
  'registered_address',
  'contact_name',
  'contact_email',
  'contact_phone',
  'director_name',
  'director_bvn',
];

const LABELS: Record<keyof KybDetails, string> = {
  legal_name: 'Registered legal name',
  trading_name: 'Trading name (if different)',
  rc_number: 'CAC registration number',
  tax_id: 'Tax identification number (TIN)',
  business_type: 'Business type',
  registered_address: 'Registered address',
  contact_name: 'Primary contact name',
  contact_email: 'Primary contact email',
  contact_phone: 'Primary contact phone',
  director_name: 'Director / signatory name',
  director_bvn: 'Director BVN',
};

const inputClass =
  'w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 ' +
  'text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-[#fed700] ' +
  'disabled:opacity-60';

const labelClass =
  'block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5';

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'ok' | 'wait' | 'warn';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    ok: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300',
    wait: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-300',
    warn: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300',
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${tones[tone]}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed opacity-90">{children}</p>
      </div>
    </div>
  );
}

export default function KybPanel({ business, onBusinessUpdated }: KybPanelProps) {
  const [details, setDetails] = useState<KybDetails>({ ...EMPTY, legal_name: business.name });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof KybDetails, value: string) =>
    setDetails((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const missing = REQUIRED.filter((k) => !details[k]?.trim());
    if (missing.length > 0) {
      setError(`Fill in every required field — missing ${LABELS[missing[0]].toLowerCase()}.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await submitKyb(details);
      onBusinessUpdated(result.business);
    } catch (err) {
      setSubmitting(false);
      // `submit_kyb` matches `{status:"active", tier_1:false}`; anything else
      // matches no document and surfaces as `business_frozen`, which would read
      // as an account problem when the real cause is almost always that KYB has
      // already been submitted.
      if (err instanceof BusinessRequestError && err.code === 'business_frozen') {
        setError(
          'This business can no longer submit KYB — it has either already been submitted or is not in sandbox-active status.'
        );
        return;
      }
      setError(err instanceof BusinessRequestError ? err.message : 'Something went wrong. Try again.');
    }
  };

  /* --- Terminal states: nothing to submit ------------------------------ */

  if (business.tier_1) {
    return (
      <Banner tone="ok" icon={<BadgeCheck className="w-5 h-5" />} title="KYB approved">
        This business is Tier&nbsp;1 verified. Live-environment API keys are unlocked.
      </Banner>
    );
  }

  if (business.status === 'kyb_pending') {
    return (
      <Banner tone="wait" icon={<Clock className="w-5 h-5" />} title="KYB under review">
        Your details are with the compliance team. Sandbox access continues while they review.
        There is no endpoint to read back or amend a submission, so any correction has to go
        through your Fluxel contact.
      </Banner>
    );
  }

  if (business.status !== 'active') {
    return (
      <Banner tone="warn" icon={<TriangleAlert className="w-5 h-5" />} title="KYB unavailable">
        This business is <code className="font-mono">{business.status}</code>. Only a
        sandbox-active business can submit KYB — contact your Fluxel representative.
      </Banner>
    );
  }

  /* --- The form -------------------------------------------------------- */

  const field = (key: keyof KybDetails, type = 'text') => (
    <div>
      <label htmlFor={`kyb-${key}`} className={labelClass}>
        {LABELS[key]}
        {!REQUIRED.includes(key) && (
          <span className="ml-1 normal-case tracking-normal font-normal text-slate-400">
            optional
          </span>
        )}
      </label>
      <input
        id={`kyb-${key}`}
        type={type}
        value={details[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
        disabled={submitting}
        spellCheck={false}
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-800">
        <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Submitting moves the business to <strong>KYB pending</strong>. It can only be done once —
          there is no amend or withdraw endpoint, and the submitted details cannot be read back.
          Sandbox access is unaffected while it is reviewed; approval is what unlocks live keys.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('legal_name')}
          {field('trading_name')}
          {field('rc_number')}
          {field('tax_id')}
        </div>

        <div>
          <label htmlFor="kyb-business_type" className={labelClass}>
            {LABELS.business_type}
          </label>
          <select
            id="kyb-business_type"
            value={details.business_type}
            onChange={(e) => set('business_type', e.target.value)}
            disabled={submitting}
            className={inputClass}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {field('registered_address')}

        <div className="grid gap-4 sm:grid-cols-3">
          {field('contact_name')}
          {field('contact_email', 'email')}
          {field('contact_phone', 'tel')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field('director_name')}
          {field('director_bvn')}
        </div>

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2.5 text-xs font-bold text-white dark:text-slate-950 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 rounded-lg inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {submitting ? 'Submitting…' : 'Submit KYB for review'}
          </button>
        </div>
      </form>
    </div>
  );
}
