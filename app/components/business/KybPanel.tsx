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
  'w-full h-11 px-3.5 rounded-lg bg-surface border border-line-strong text-base sm:text-sm text-ink ' +
  'outline-none focus:border-gold focus:ring-2 focus:ring-brand/30 disabled:opacity-60 transition-colors';

const labelClass =
  'block text-sm font-medium text-ink-2 mb-2';

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
    ok: 'bg-surface border-line [&_.kyb-icon]:text-positive',
    wait: 'bg-gold-soft border-brand/40 [&_.kyb-icon]:text-gold',
    warn: 'bg-surface border-negative/30 [&_.kyb-icon]:text-negative',
  };
  return (
    <div className={`flex items-start gap-4 p-5 rounded-xl border ${tones[tone]}`}>
      <span className="kyb-icon shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-ink-2">{children}</div>
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
          'Your details have already been submitted, so there’s nothing more to send. If something needs changing, email customersupport@fluxel.app.'
        );
        return;
      }
      setError(err instanceof BusinessRequestError ? err.message : 'Something went wrong. Try again.');
    }
  };

  /* --- Terminal states: nothing to submit ------------------------------ */

  if (business.tier_1) {
    return (
      <Banner tone="ok" icon={<BadgeCheck className="w-5 h-5" />} title="Your business is verified">
        Live payments and live API keys are unlocked. You’re ready to take real money.
      </Banner>
    );
  }

  if (business.status === 'kyb_pending') {
    return (
      <Banner tone="wait" icon={<Clock className="w-5 h-5" />} title="We’re reviewing your business">
        <p>
          Thanks — your details are with our compliance team. You can keep using sandbox in the meantime, and live
          payments unlock as soon as you’re approved.
        </p>
        <p className="mt-2">
          Need to correct something you sent? Email <a href="mailto:customersupport@fluxel.app" className="font-medium text-ink underline underline-offset-4 decoration-brand hover:decoration-2">customersupport@fluxel.app</a> and we’ll update it for you.
        </p>
      </Banner>
    );
  }

  if (business.status !== 'active') {
    return (
      <Banner tone="warn" icon={<TriangleAlert className="w-5 h-5" />} title="Verification isn’t available right now">
        We can’t take verification details for this account at the moment. Email <a href="mailto:customersupport@fluxel.app" className="font-medium text-ink underline underline-offset-4 decoration-brand hover:decoration-2">customersupport@fluxel.app</a> and we’ll sort it out.
      </Banner>
    );
  }

  /* --- The form -------------------------------------------------------- */

  const field = (key: keyof KybDetails, type = 'text') => (
    <div>
      <label htmlFor={`kyb-${key}`} className={labelClass}>
        {LABELS[key]}
        {!REQUIRED.includes(key) && (
          <span className="ml-1 font-normal text-ink-3">
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
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gold-soft border border-brand/40">
        <ShieldCheck className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="text-sm leading-relaxed">
          <p className="font-semibold text-ink">Verify your business to accept live payments</p>
          <p className="mt-1 text-ink-2">
            Please check everything carefully before you submit — you can only send this once, and changes afterwards go
            through our support team. Sandbox keeps working while we review.
          </p>
        </div>
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
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-line flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-4 text-sm font-medium text-brand-ink bg-brand hover:bg-brand-strong rounded-lg inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {submitting ? 'Submitting…' : 'Submit KYB for review'}
          </button>
        </div>
      </form>
    </div>
  );
}
