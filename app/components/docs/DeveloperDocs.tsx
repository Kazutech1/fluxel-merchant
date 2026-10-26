'use client';

/**
 * Developer docs: the standalone `/docs` page, opened in a new browser tab
 * from Developers in the console.
 *
 * Written against the Fluxel API as it actually behaves today (routes and
 * schemas in Fluxel-System's openapi.json, webhook delivery in the worker),
 * not against the design docs — where the two differ, this says what works
 * now. Each section is its own view at `/docs#<section>`.
 */

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  Bitcoin,
  BookOpen,
  CircleAlert,
  Coins,
  FlaskConical,
  Info,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  Link2,
  ListTree,
  Moon,
  Radio,
  Rocket,
  Send,
  Sun,
  TriangleAlert,
  Webhook,
  Zap,
} from 'lucide-react';

import { useCryptoEnabled } from '../../lib/features';
import { toggleTheme, useTheme } from '../../lib/theme';
import { CodeBlock, cx, selectClass } from '../console/ui';

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

type SectionId =
  | 'introduction'
  | 'quickstart'
  | 'authentication'
  | 'sandbox'
  | 'amounts'
  | 'requests'
  | 'errors'
  | 'naira'
  | 'payment-links'
  | 'crypto'
  | 'payouts'
  | 'withdrawals'
  | 'transfers'
  | 'webhooks'
  | 'events'
  | 'reference';

interface SectionMeta {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  crypto?: boolean;
}

const GROUPS: { label: string; items: SectionMeta[] }[] = [
  {
    label: 'Get started',
    items: [
      { id: 'introduction', title: 'Introduction', icon: BookOpen },
      { id: 'quickstart', title: 'Quick start', icon: Rocket },
      { id: 'authentication', title: 'Authentication', icon: KeyRound },
      { id: 'sandbox', title: 'Testing in sandbox', icon: FlaskConical },
    ],
  },
  {
    label: 'Core concepts',
    items: [
      { id: 'amounts', title: 'Amounts & assets', icon: Coins },
      { id: 'requests', title: 'Requests & pagination', icon: Zap },
      { id: 'errors', title: 'Errors', icon: CircleAlert },
    ],
  },
  {
    label: 'Guides',
    items: [
      { id: 'naira', title: 'Accept Naira payments', icon: Landmark },
      { id: 'payment-links', title: 'Payment links', icon: Link2 },
      { id: 'crypto', title: 'Accept crypto', icon: Bitcoin, crypto: true },
      { id: 'payouts', title: 'Pay out to a bank', icon: Banknote },
      { id: 'withdrawals', title: 'Crypto withdrawals', icon: Send, crypto: true },
      { id: 'transfers', title: 'Transfers between customers', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Webhooks',
    items: [
      { id: 'webhooks', title: 'Receiving webhooks', icon: Webhook },
      { id: 'events', title: 'Event types', icon: Radio },
    ],
  },
  {
    label: 'Reference',
    items: [{ id: 'reference', title: 'API reference', icon: ListTree }],
  },
];

/* ------------------------------------------------------------------ */
/* Shared state: base URL, chosen language, navigation                 */
/* ------------------------------------------------------------------ */

type Lang = 'curl' | 'node' | 'python';
const LANG_LABEL: Record<Lang, string> = { curl: 'cURL', node: 'Node.js', python: 'Python' };
const LANG_KEY = 'fluxel.docs.lang';

interface DocsContext {
  base: string;
  lang: Lang;
  setLang: (lang: Lang) => void;
  go: (id: SectionId) => void;
  crypto: boolean;
}

const Ctx = createContext<DocsContext | null>(null);
const useDocs = () => useContext(Ctx)!;

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15.5px] leading-7 text-ink-2">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 mb-3 text-lg font-semibold tracking-tight text-ink">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="my-3 text-[14.5px] leading-7 text-ink-2">{children}</p>;
}

/** Inline code. */
function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded-md bg-subtle border border-line text-ink whitespace-nowrap">
      {children}
    </code>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="my-3 space-y-2 text-[14.5px] leading-7 text-ink-2 list-disc pl-5 marker:text-ink-3">{children}</ul>;
}

/** A link to another docs section. */
function To({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const { go } = useDocs();
  return (
    <button type="button" onClick={() => go(id)} className="text-gold font-medium underline decoration-brand/40 underline-offset-2 hover:decoration-brand cursor-pointer">
      {children}
    </button>
  );
}

const CALLOUT = {
  info: { icon: Info, box: 'border-line bg-subtle', iconClass: 'text-ink-2' },
  tip: { icon: Lightbulb, box: 'border-brand/50 bg-gold-soft', iconClass: 'text-gold' },
  warn: { icon: TriangleAlert, box: 'border-pending/40 bg-pending/10', iconClass: 'text-pending' },
};

function Callout({ tone = 'info', title, children }: { tone?: keyof typeof CALLOUT; title?: string; children: React.ReactNode }) {
  const s = CALLOUT[tone];
  const Icon = s.icon;
  return (
    <div className={cx('my-5 flex gap-3 rounded-xl border px-4 py-3.5', s.box)}>
      <Icon className={cx('size-[18px] shrink-0 mt-0.5', s.iconClass)} />
      <div className="min-w-0 text-[14px] leading-6 text-ink-2">
        {title && <p className="font-medium text-ink mb-0.5">{title}</p>}
        {children}
      </div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="my-6 space-y-8 [counter-reset:step]">{children}</ol>;
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="relative pl-11 [counter-increment:step] before:content-[counter(step)] before:absolute before:left-0 before:top-0 before:size-7 before:rounded-full before:bg-gold-soft before:border before:border-brand/50 before:text-gold before:text-[13px] before:font-semibold before:flex before:items-center before:justify-center">
      <h3 className="text-[15px] font-semibold text-ink leading-7">{title}</h3>
      <div className="[&>p:first-child]:mt-1">{children}</div>
    </li>
  );
}

/** A left-to-right chain of steps, wrapping on small screens. */
function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="my-5 flex flex-wrap items-center gap-x-2 gap-y-2.5">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span className="inline-flex items-center h-8 px-3 rounded-lg border border-line bg-surface text-[13px] text-ink">{s}</span>
          {i < steps.length - 1 && <ArrowRight aria-hidden className="size-4 text-ink-3" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-[13.5px]">
        <thead className="bg-subtle text-ink-2">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-ink-2 leading-6">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const METHOD_STYLE: Record<Method, string> = {
  GET: 'text-positive bg-positive/10 border-positive/30',
  POST: 'text-gold bg-gold-soft border-brand/50',
  PUT: 'text-ink-2 bg-subtle border-line-strong',
  DELETE: 'text-negative bg-negative/10 border-negative/30',
};

function MethodBadge({ method }: { method: Method }) {
  return (
    <span className={cx('inline-flex items-center justify-center h-6 min-w-14 px-1.5 rounded-md border font-mono text-[11px] font-semibold', METHOD_STYLE[method])}>
      {method}
    </span>
  );
}

/** Code with language tabs. The chosen language is shared by every block on every page. */
function LangCode({ code }: { code: Partial<Record<Lang, string>> }) {
  const { lang, setLang } = useDocs();
  const available = (Object.keys(LANG_LABEL) as Lang[]).filter((l) => code[l]);
  const active = available.includes(lang) ? lang : available[0];
  return (
    <div className="my-4">
      <CodeBlock
        code={code[active]!}
        header={available.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cx(
              'h-7 px-2.5 rounded-md text-[12px] font-medium cursor-pointer whitespace-nowrap',
              l === active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      />
    </div>
  );
}

function Json({ label = 'Response', value }: { label?: string; value: unknown }) {
  return (
    <div className="my-4">
      <CodeBlock code={JSON.stringify(value, null, 2)} header={<span className="px-2.5 text-[12px] font-medium text-slate-400">{label}</span>} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Request snippets — one definition, three languages                  */
/* ------------------------------------------------------------------ */

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const indent = (text: string, by: number) => text.split('\n').join(`\n${' '.repeat(by)}`);

function snippets(base: string, method: Method, path: string, body?: object): Record<Lang, string> {
  const url = `${base}/v1${path}`;
  const writes = method !== 'GET';
  const json = body ? JSON.stringify(body, null, 2) : null;

  const curl = [
    `curl${method === 'GET' ? '' : ` -X ${method}`} ${url}`,
    `  -H "Authorization: Bearer $FLUXEL_SECRET_KEY"`,
    ...(json ? [`  -H "Content-Type: application/json"`] : []),
    ...(writes ? [`  -H "Idempotency-Key: $(uuidgen)"`] : []),
    ...(json ? [`  -d '${indent(json, 2)}'`] : []),
  ].join(' \\\n');

  const nodeHeaders = [
    'Authorization: `Bearer ${process.env.FLUXEL_SECRET_KEY}`,',
    ...(json ? [`'Content-Type': 'application/json',`] : []),
    ...(writes ? [`'Idempotency-Key': crypto.randomUUID(),`] : []),
  ];
  const node = [
    `const res = await fetch('${url}', {`,
    ...(writes ? [`  method: '${method}',`] : []),
    `  headers: {`,
    ...nodeHeaders.map((h) => `    ${h}`),
    `  },`,
    ...(json ? [`  body: JSON.stringify(${indent(json, 2)}),`] : []),
    `});`,
    `const data = await res.json();`,
  ].join('\n');

  const pyJson = json?.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None');
  const python = [
    `import os${writes ? ', uuid' : ''}`,
    `import requests`,
    ``,
    `res = requests.${method.toLowerCase()}(`,
    `    "${url}",`,
    `    headers={`,
    `        "Authorization": f"Bearer {os.environ['FLUXEL_SECRET_KEY']}",`,
    ...(writes ? [`        "Idempotency-Key": str(uuid.uuid4()),`] : []),
    `    },`,
    ...(pyJson ? [`    json=${indent(pyJson, 4)},`] : []),
    `)`,
    `data = res.json()`,
  ].join('\n');

  return { curl, node, python };
}

/** One API call: the endpoint line, the code in three languages, and an example response. */
function Request({ method, path, body, response }: { method: Method; path: string; body?: object; response?: unknown }) {
  const { base } = useDocs();
  return (
    <div className="my-5">
      <div className="flex items-center gap-2.5 mb-2">
        <MethodBadge method={method} />
        <code className="font-mono text-[13px] text-ink break-all">{path}</code>
      </div>
      <LangCode code={snippets(base, method, path, body)} />
      {response !== undefined && <Json value={response} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function Introduction() {
  const { base, crypto } = useDocs();
  const blocks = [
    { icon: KeyRound, title: 'Customers', body: 'Each user of your app gets a Fluxel customer with their own balances. You link them with your own ID.' },
    {
      icon: Landmark,
      title: 'Collect',
      body: crypto
        ? 'Take Naira by bank transfer to a one-time account number, or crypto to the customer’s own wallet addresses.'
        : 'Take Naira by bank transfer to a one-time account number that Fluxel creates for each payment.',
    },
    {
      icon: Banknote,
      title: 'Move money',
      body: crypto ? 'Pay out to any Nigerian bank, send crypto to a wallet, or move money between your customers.' : 'Pay out to any Nigerian bank, or move money between your customers.',
    },
    { icon: Webhook, title: 'Stay in sync', body: 'Fluxel sends signed webhooks to your server when money arrives or leaves, so you never need to guess.' },
  ];
  return (
    <>
      <Lead>
        The Fluxel API lets your app collect payments, hold a balance for each of your customers, and pay money out — all from your own server with a few
        simple HTTP calls. This guide walks you through everything, step by step.
      </Lead>

      <H2>How it fits together</H2>
      <div className="grid sm:grid-cols-2 gap-3 my-5">
        {blocks.map((b) => (
          <div key={b.title} className="rounded-xl border border-line bg-surface p-4">
            <b.icon className="size-5 text-gold" />
            <p className="mt-3 font-medium text-ink">{b.title}</p>
            <p className="mt-1 text-[13.5px] leading-6 text-ink-3">{b.body}</p>
          </div>
        ))}
      </div>

      <H2>A typical payment, start to finish</H2>
      <Flow steps={['Create a customer', 'Create a deposit intent', 'Customer pays by transfer', 'Webhook: deposit settled', 'Balance goes up']} />
      <P>
        You create the customer once. Every time they want to pay, you create a <strong className="text-ink font-medium">deposit intent</strong> — Fluxel
        gives you a bank account number to show them. When the money lands, Fluxel credits their balance and tells your server with a webhook.
      </P>

      <H2>Base URL</H2>
      <P>Every endpoint lives under this address. Sandbox and live use the same URL — your API key decides which one you’re talking to.</P>
      <CodeBlock code={`${base}/v1`} />
      <P>
        Every endpoint is listed in the <To id="reference">API reference</To>.
      </P>

      <H2>Before you start</H2>
      <List>
        <li>
          Create a sandbox secret key in <Link href="/#developers" className="text-gold font-medium underline decoration-brand/40 underline-offset-2 hover:decoration-brand">Developers → API keys</Link>.
        </li>
        <li>Keep it on your server. Never put a secret key in a website, mobile app or Git repository.</li>
        <li>
          Then follow the <To id="quickstart">Quick start</To> — you’ll take your first test payment in about five minutes.
        </li>
      </List>
    </>
  );
}

function QuickStart() {
  return (
    <>
      <Lead>Take a test payment of ₦2,500 from start to finish. Everything here runs in sandbox — no real money moves.</Lead>
      <Steps>
        <Step title="Get your sandbox secret key">
          <P>
            Go to <Link href="/#developers" className="text-gold font-medium underline decoration-brand/40 underline-offset-2 hover:decoration-brand">Developers → API keys</Link>, choose <strong className="text-ink font-medium">Sandbox keys</strong>{' '}
            and create a <strong className="text-ink font-medium">Secret key</strong>. It starts with <C>sk_test_</C>. Save it as an environment variable:
          </P>
          <CodeBlock code={`export FLUXEL_SECRET_KEY="sk_test_..."`} />
        </Step>

        <Step title="Create a customer">
          <P>
            Pass your own user ID as <C>external_id</C> so you can match them up later.
          </P>
          <Request
            method="POST"
            path="/customers"
            body={{ external_id: 'user_1042', name: 'Ada Lovelace', email: 'ada@example.com' }}
            response={{ id: 'cus_01JC4Z8X2M7Q', status: 'active', wallets: 'provisioning' }}
          />
          <P>
            Save the returned <C>id</C> against your user — you’ll use it for every payment they make.
          </P>
        </Step>

        <Step title="Ask them to pay ₦2,500">
          <P>
            Amounts are in kobo, as strings — so ₦2,500.00 is <C>{'"250000"'}</C>. This creates a one-time bank account for this payment.
          </P>
          <Request
            method="POST"
            path="/customers/cus_01JC4Z8X2M7Q/fiat-deposit-intents"
            body={{ amount: '250000', amount_mode: 'fixed' }}
            response={{
              id: 'fdi_01JC4ZB0K9TR',
              customer_id: 'cus_01JC4Z8X2M7Q',
              status: 'pending',
              expected_amount: '250000',
              amount_received: '0',
              expires_at: '2026-10-26T15:30:00Z',
              va: null,
            }}
          />
          <P>
            A second or two later the account number is ready. Fetch the intent again (or listen for the <C>fiat.deposit_intent.ready</C> webhook) and show
            the <C>va</C> details to your customer.
          </P>
        </Step>

        <Step title="Pretend the customer paid">
          <P>In sandbox you can simulate the bank transfer instead of sending real money:</P>
          <Request method="POST" path="/sandbox/simulate/fiat-deposit" body={{ deposit_intent_id: 'fdi_01JC4ZB0K9TR', amount: '250000' }} />
        </Step>

        <Step title="Check their balance">
          <Request
            method="GET"
            path="/customers/cus_01JC4Z8X2M7Q/balances"
            response={[{ asset_code: 'NGN', available: '247500', pending: '0', total: '247500' }]}
          />
          <P>The balance is the amount paid, less your deposit fee. That’s it — you’ve taken your first payment.</P>
        </Step>
      </Steps>

      <Callout tone="tip" title="Next up">
        In a real app you shouldn’t keep checking balances. Set up <To id="webhooks">webhooks</To> so Fluxel tells you the moment money arrives, then read the{' '}
        <To id="naira">Naira payments guide</To> for what happens when someone pays too little, too much, or too late.
      </Callout>
    </>
  );
}

function Authentication() {
  const { base } = useDocs();
  return (
    <>
      <Lead>
        Every request carries an API key in the <C>Authorization</C> header. There are two kinds of key, and each comes in a sandbox and a live version.
      </Lead>

      <Table
        head={['Key', 'Starts with', 'Can do', 'Where it lives']}
        rows={[
          [<strong key="s" className="text-ink font-medium">Secret</strong>, <C key="p">sk_test_ / sk_live_</C>, 'Everything — including moving money', 'Your server only'],
          [<strong key="s" className="text-ink font-medium">Publishable</strong>, <C key="p">pk_test_ / pk_live_</C>, 'Read-only (GET requests)', 'Safe in a website or app'],
        ]}
      />

      <H2>Sending the key</H2>
      <CodeBlock code={`curl ${base}/v1/balances \\\n  -H "Authorization: Bearer sk_test_..."`} />
      <P>
        Use HTTPS for every call. Using a publishable key on a write (like creating a payout) is refused with <C>403 key_class_insufficient</C>.
      </P>

      <H2>Sandbox vs live</H2>
      <P>
        The key picks the environment: <C>_test_</C> keys only ever touch sandbox data, <C>_live_</C> keys move real money. Live keys unlock once your business
        is verified (Settings → Verification).
      </P>

      <H2>Keeping keys safe</H2>
      <List>
        <li>Store keys in environment variables or a secrets manager — never in code.</li>
        <li>
          <strong className="text-ink font-medium">Roll</strong> a key from the dashboard if you think it leaked. Fluxel creates the new key first, then revokes
          the old one, so you’re never left without a key.
        </li>
        <li>
          Add an <strong className="text-ink font-medium">IP allowlist</strong> to a secret key so it only works from your servers’ addresses.
        </li>
        <li>A key is shown once, when it’s created. If you lose it, create a new one.</li>
      </List>

      <H2>When authentication fails</H2>
      <Table
        head={['Status', 'Code', 'What it means']}
        rows={[
          ['401', <C key="c">key_invalid</C>, 'The key doesn’t exist — check for typos or a missing “Bearer ”.'],
          ['401', <C key="c">key_revoked</C>, 'The key was revoked or rolled. Use the new one.'],
          ['403', <C key="c">key_class_insufficient</C>, 'You used a publishable key for a write. Use a secret key.'],
          ['403', <C key="c">business_frozen</C>, 'Your business is frozen. Contact Fluxel support.'],
        ]}
      />
    </>
  );
}

function Sandbox() {
  const { crypto } = useDocs();
  return (
    <>
      <Lead>
        Sandbox is a full copy of Fluxel with no real money. Use your <C>sk_test_</C> key and the same base URL — everything else works exactly like live.
      </Lead>

      <H2>Simulate a Naira payment</H2>
      <P>Create a deposit intent as normal, then tell Fluxel the customer paid:</P>
      <Request method="POST" path="/sandbox/simulate/fiat-deposit" body={{ deposit_intent_id: 'fdi_01JC4ZB0K9TR', amount: '250000' }} />
      <List>
        <li>Send the exact amount to test a normal payment.</li>
        <li>Send less to test an underpayment, or more to test an overpayment and refund.</li>
        <li>
          Send <C>{'{ "business_static_account": true, "amount": "500000" }'}</C> instead to simulate a top-up of your business balance.
        </li>
      </List>
      <P>This endpoint only exists in sandbox — it’s refused with a live key.</P>

      {crypto && (
        <>
          <H2>Test crypto</H2>
          <P>There’s no crypto simulator. Sandbox runs on real public test networks, so send test coins from a faucet to your customer’s address:</P>
          <Table
            head={['Chain', 'Test network']}
            rows={[
              ['Bitcoin', 'testnet4'],
              ['Ethereum', 'Sepolia'],
              ['BNB Smart Chain', 'BSC testnet'],
              ['TRON', 'Nile'],
            ]}
          />
        </>
      )}

      <H2>Test your webhooks</H2>
      <P>
        In <strong className="text-ink font-medium">Developers → Webhooks</strong>, press <strong className="text-ink font-medium">Send test</strong> on an endpoint.
        Fluxel sends a signed <C>ping</C> event so you can check your signature verification end to end.
      </P>

      <H2>Going live checklist</H2>
      <List>
        <li>Your business is verified, so live keys are unlocked.</li>
        <li>
          Swap <C>sk_test_</C> for <C>sk_live_</C> in your server’s environment.
        </li>
        <li>Add a live webhook endpoint — it gets its own signing secret.</li>
        <li>Remove any calls to the sandbox simulator.</li>
      </List>
    </>
  );
}

function Amounts() {
  const { crypto } = useDocs();
  const assets: [string, string, string][] = [
    ['NGN', '—', '2'],
    ['BTC', 'Bitcoin', '8'],
    ['ETH', 'Ethereum', '18'],
    ['USDT-ETH', 'Ethereum', '6'],
    ['USDC-ETH', 'Ethereum', '6'],
    ['BNB', 'BNB Smart Chain', '18'],
    ['USDT-BSC', 'BNB Smart Chain', '18'],
    ['USDC-BSC', 'BNB Smart Chain', '18'],
    ['TRX', 'TRON', '6'],
    ['USDT-TRON', 'TRON', '6'],
  ];
  return (
    <>
      <Lead>
        Fluxel never uses decimals or floating-point numbers for money. Every amount is a <strong className="text-ink font-medium">string</strong> in the
        asset’s <strong className="text-ink font-medium">smallest unit</strong>.
      </Lead>

      <Table
        head={['You mean', 'Asset', 'Send this']}
        rows={[
          ['₦2,500.00', <C key="a">NGN</C>, <C key="v">{'"250000"'}</C>],
          ['₦100.50', <C key="a">NGN</C>, <C key="v">{'"10050"'}</C>],
          ...(crypto
            ? [
                ['0.0005 BTC', <C key="a">BTC</C>, <C key="v">{'"50000"'}</C>],
                ['10 USDT on TRON', <C key="a">USDT-TRON</C>, <C key="v">{'"10000000"'}</C>],
              ]
            : []),
        ]}
      />
      <P>
        Naira has 2 decimal places, so the smallest unit is the kobo — multiply by 100. Strings are used so very large crypto amounts never lose precision.
      </P>

      <H2>Converting safely</H2>
      <LangCode
        code={{
          node: `// "2500.50" with 2 decimals -> "250050". No floats involved.
function toMinor(value, decimals) {
  const [whole, frac = ''] = value.split('.');
  return BigInt(whole + frac.padEnd(decimals, '0').slice(0, decimals)).toString();
}`,
          python: `from decimal import Decimal

# "2500.50" with 2 decimals -> "250050". No floats involved.
def to_minor(value: str, decimals: int) -> str:
    return str(int(Decimal(value).scaleb(decimals)))`,
        }}
      />

      {crypto && (
        <>
          <H2>Supported assets</H2>
          <Table head={['Asset code', 'Chain', 'Decimals']} rows={assets.map(([a, c, d]) => [<C key="a">{a}</C>, c, d])} />
          <Callout tone="warn" title="Same token, different decimals">
            USDT and USDC on BNB Smart Chain use <strong className="text-ink">18</strong> decimals, not 6 like on Ethereum and TRON. Always check before
            converting.
          </Callout>
          <P>
            The live list (including which assets are enabled) is always at <C>GET /assets</C>.
          </P>
        </>
      )}

      <H2>Previewing fees</H2>
      <P>See exactly what a deposit or withdrawal will cost before it happens. Nothing is charged.</P>
      <Request
        method="GET"
        path="/fees/preview?operation=deposit&amount=250000"
        response={{ operation: 'deposit', amount: '250000', fee: '2500', net_amount: '247500' }}
      />
    </>
  );
}

function Requests() {
  return (
    <>
      <Lead>A few rules that apply to every endpoint. Get these right once and the rest of the API feels predictable.</Lead>

      <H2>JSON in, JSON out</H2>
      <P>
        Send request bodies as JSON with <C>Content-Type: application/json</C>. Every response is JSON too. New fields can be added to responses at any time,
        so ignore fields you don’t recognise rather than failing on them.
      </P>

      <H2>Idempotency keys</H2>
      <P>
        Networks fail. To make retries safe, send a unique <C>Idempotency-Key</C> header (a UUID works well) on every <C>POST</C>, <C>PUT</C> and{' '}
        <C>DELETE</C>. If you retry the same request, reuse the same key.
      </P>
      <CodeBlock code={`Idempotency-Key: 6f1c9e2a-3b4d-4c8e-9a1f-2d7b5e0c4a11`} />
      <Callout tone="warn" title="Not enforced yet">
        Fluxel accepts the header today but doesn’t yet use it to block duplicates. Until it does, if a money-moving request times out, check{' '}
        <C>GET /transactions</C> before you retry so you don’t pay twice. Sending the header now means you’re protected the day it switches on.
      </Callout>

      <H2>Pagination</H2>
      <P>
        List endpoints return a page of results plus a <C>next_cursor</C>. Pass it back as <C>cursor</C> to get the next page. When <C>next_cursor</C> is{' '}
        <C>null</C>, you’ve reached the end. Use <C>limit</C> to choose the page size (default 20, max 100).
      </P>
      <Json value={{ data: ['…'], next_cursor: '2026-10-26T14:02:11.204Z' }} />
      <LangCode
        code={{
          node: `async function* allTransactions() {
  let cursor;
  do {
    const url = new URL('/v1/transactions', process.env.FLUXEL_API_URL);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url, {
      headers: { Authorization: \`Bearer \${process.env.FLUXEL_SECRET_KEY}\` },
    });
    const page = await res.json();
    yield* page.data;
    cursor = page.next_cursor;
  } while (cursor);
}`,
          python: `def all_transactions():
    cursor = None
    while True:
        params = {"limit": 100, **({"cursor": cursor} if cursor else {})}
        page = requests.get(
            f"{os.environ['FLUXEL_API_URL']}/v1/transactions",
            headers={"Authorization": f"Bearer {os.environ['FLUXEL_SECRET_KEY']}"},
            params=params,
        ).json()
        yield from page["data"]
        cursor = page.get("next_cursor")
        if not cursor:
            break`,
        }}
      />
      <P>
        Paginated lists: <C>/transactions</C>, <C>/deposits</C>, <C>/transfers</C>, <C>/refunds</C> and <C>/payment-links</C>.
      </P>

      <H2>Tracing a request</H2>
      <P>
        Send an <C>X-Correlation-ID</C> header and Fluxel echoes it back on the response (or creates one if you don’t). Include it when you contact support —
        it lets us find your exact request.
      </P>

      <H2>Rate limits</H2>
      <P>
        Rate limits aren’t switched on yet. When they are, an over-limit request gets <C>429 rate_limited</C> with a <C>Retry-After</C> header — build your
        client to wait that many seconds and try again.
      </P>

      <H2>Versioning</H2>
      <P>
        Everything here is <C>/v1</C>. Within v1 Fluxel only makes additive changes: new endpoints, new fields, new status values. Anything breaking would ship
        as <C>/v2</C>, with time to move over.
      </P>
    </>
  );
}

function Errors() {
  const codes: [string, string, string][] = [
    ['validation_failed', '400 / 422', 'A field is missing or invalid. The message says which.'],
    ['unauthorized', '401', 'No key, or a malformed Authorization header.'],
    ['key_invalid', '401', 'The key doesn’t exist.'],
    ['key_revoked', '401', 'The key was revoked or rolled.'],
    ['insufficient_balance', '402', 'Not enough available balance for this payout, withdrawal or transfer.'],
    ['key_class_insufficient', '403', 'A publishable key was used for a write.'],
    ['business_frozen', '403', 'Your business is frozen — contact support.'],
    ['customer_frozen', '403', 'This customer is frozen. Unfreeze them first.'],
    ['not_found', '404', 'No such object, or it belongs to another business.'],
    ['idempotency_conflict', '409', 'You reused an Idempotency-Key with a different body.'],
    ['destination_invalid', '422', 'The bank account or wallet address can’t be used.'],
    ['amount_below_minimum', '422', 'The amount is under the minimum for this asset.'],
    ['amount_above_maximum', '422', 'The amount is over your limit.'],
    ['asset_disabled', '422', 'This asset is switched off right now.'],
    ['rate_limited', '429', 'Too many requests — wait for Retry-After.'],
    ['provider_unavailable', '503', 'The bank partner is down. Safe to retry shortly.'],
    ['internal_error', '500', 'Something broke on our side. Retry, then contact support.'],
  ];
  return (
    <>
      <Lead>
        When something goes wrong, Fluxel answers with a normal HTTP status code and a JSON body that tells you what happened in plain words.
      </Lead>
      <Json label="Error body" value={{ error: { code: 'insufficient_balance', message: 'available balance is lower than the requested amount' } }} />
      <P>
        Match on <C>code</C> in your code — it never changes. The <C>message</C> is for humans and its wording may improve over time.
      </P>

      <H2>Status codes at a glance</H2>
      <Table
        head={['Range', 'Means']}
        rows={[
          [<C key="c">2xx</C>, 'It worked. 201 means something was created — read its status to see what happens next.'],
          [<C key="c">4xx</C>, 'Something about the request needs fixing. Retrying the same request won’t help.'],
          [<C key="c">5xx</C>, 'A problem on our side or with a bank partner. Safe to retry with the same Idempotency-Key.'],
        ]}
      />

      <H2>Every error code</H2>
      <Table head={['Code', 'Status', 'What to do']} rows={codes.map(([c, s, d]) => [<C key="c">{c}</C>, s, d])} />

      <Callout tone="info" title="Created doesn’t always mean done">
        A payout that’s held for review is still created — you get <C>201</C> with a status that tells you it’s waiting. Always check the <C>status</C> field,
        not just the HTTP code.
      </Callout>
    </>
  );
}

function Naira() {
  return (
    <>
      <Lead>
        Customers pay you by a normal bank transfer. For each payment, Fluxel creates a one-time account number. When the money lands, it’s matched to the
        right customer automatically — no references to type in.
      </Lead>
      <Flow steps={['Create intent', 'Account number ready', 'Customer transfers', 'Deposit settled']} />

      <H2>1. Create a deposit intent</H2>
      <Request
        method="POST"
        path="/customers/cus_01JC4Z8X2M7Q/fiat-deposit-intents"
        body={{ amount: '250000', amount_mode: 'fixed' }}
        response={{
          id: 'fdi_01JC4ZB0K9TR',
          customer_id: 'cus_01JC4Z8X2M7Q',
          status: 'pending',
          expected_amount: '250000',
          amount_received: '0',
          expires_at: '2026-10-26T15:30:00Z',
          va: null,
        }}
      />
      <Table
        head={['amount_mode', 'Use it when']}
        rows={[
          [<C key="m">fixed</C>, 'The customer must pay exactly this amount. This is the default.'],
          [<C key="m">minimum</C>, 'The amount is the least you’ll accept.'],
          [<C key="m">open</C>, 'There’s no set amount — useful for wallet top-ups. You can leave amount out.'],
        ]}
      />

      <H2>2. Get the account number</H2>
      <P>
        The account is created a moment later, so <C>va</C> starts as <C>null</C>. Pick whichever way of waiting suits you:
      </P>
      <List>
        <li>
          <strong className="text-ink font-medium">Webhook (recommended):</strong> listen for <C>fiat.deposit_intent.ready</C>. It carries the account details.
        </li>
        <li>
          <strong className="text-ink font-medium">Poll:</strong> call <C>GET /fiat-deposit-intents/{'{id}'}</C> every second or two until <C>va</C> is filled in.
        </li>
        <li>
          <strong className="text-ink font-medium">Stream:</strong> open <C>GET /fiat-deposit-intents/{'{id}'}/events</C> — a Server-Sent Events stream that
          sends a <C>status</C> event every time the intent changes, and closes when it finishes.
        </li>
      </List>
      <Request
        method="GET"
        path="/fiat-deposit-intents/fdi_01JC4ZB0K9TR"
        response={{
          id: 'fdi_01JC4ZB0K9TR',
          customer_id: 'cus_01JC4Z8X2M7Q',
          status: 'ready',
          expected_amount: '250000',
          amount_received: '0',
          expires_at: '2026-10-26T15:30:00Z',
          va: { bank_name: 'Lenco MFB', account_number: '1234567890', account_name: 'Fluxel / Ada Lovelace' },
        }}
      />
      <P>
        Show the bank name, account number and amount to your customer. The account is valid for <strong className="text-ink font-medium">30 minutes</strong> —
        show a countdown using <C>expires_at</C>.
      </P>

      <H2>3. What happens next</H2>
      <Table
        head={['If the customer…', 'Status becomes', 'You receive']}
        rows={[
          ['Pays the right amount', <C key="s">fulfilled</C>, <C key="e">fiat.deposit.settled</C>],
          ['Pays too little', <C key="s">underpaid</C>, <C key="e">fiat.deposit_intent.underpaid</C>],
          ['Pays too much', <C key="s">fulfilled</C>, <span key="e"><C>fiat.deposit.settled</C>, then a refund of the extra</span>],
          ['Doesn’t pay in 30 minutes', <C key="s">expired</C>, <C key="e">fiat.deposit_intent.expired</C>],
        ]}
      />
      <Callout tone="tip" title="When to credit your user">
        Give your user their goods or credit on <C>fiat.deposit.settled</C> — that’s the moment the money is in their Fluxel balance. <C>ready</C> only means
        the account number exists.
      </Callout>
      <P>
        Underpayments are reviewed by the Fluxel team. The account stays open meanwhile, and you get <C>fiat.deposit_intent.resolved</C> with a{' '}
        <C>resolution</C> of <C>credited</C>, <C>refunded</C> or <C>written_off</C> once it’s sorted. Overpayment refunds report progress with{' '}
        <C>fiat.refund.initiated</C> then <C>fiat.refund.completed</C> or <C>fiat.refund.failed</C>.
      </P>

      <H2>Topping up your own business balance</H2>
      <P>
        To fund payouts, your business has a permanent account number at <C>GET /business/static-account</C>. If you’d rather have a one-off account for a
        set amount, use <C>POST /business/topup-intents</C>. Either way you’ll get <C>fiat.business_topup.settled</C> when it lands.
      </P>
    </>
  );
}

function PaymentLinks() {
  return (
    <>
      <Lead>
        A payment link is a deposit intent with a title and description attached — handy when you want to bill a customer without building your own payment
        screen. Payment links are Naira only.
      </Lead>
      <Request
        method="POST"
        path="/payment-links"
        body={{ customer_id: 'cus_01JC4Z8X2M7Q', amount: '1500000', title: 'Invoice #1042', description: 'Website design — October', redirect_url: 'https://yourapp.com/thanks' }}
        response={{
          id: 'pl_01JC52QK7W3N',
          customer_id: 'cus_01JC4Z8X2M7Q',
          deposit_intent_id: 'fdi_01JC52QK9P1D',
          amount: '1500000',
          asset_code: 'NGN',
          title: 'Invoice #1042',
          description: 'Website design — October',
          redirect_url: 'https://yourapp.com/thanks',
          voided: false,
          status: 'pending',
        }}
      />
      <P>
        The link’s <C>status</C> is always the status of its deposit intent, so everything in the <To id="naira">Naira payments guide</To> applies —
        including the 30-minute window and the same webhooks.
      </P>
      <P>
        To share a hosted checkout page with the customer, open <strong className="text-ink font-medium">Payment links</strong> in the dashboard and copy the
        link from there.
      </P>

      <H2>Voiding a link</H2>
      <Request method="POST" path="/payment-links/pl_01JC52QK7W3N/void" />
      <Callout tone="warn" title="Voiding is for your records">
        A voided link is marked as voided, but the bank account behind it isn’t closed early. Someone who already has the account details could still pay
        until it expires.
      </Callout>
    </>
  );
}

function Crypto() {
  return (
    <>
      <Lead>Every customer gets their own crypto addresses, so you always know who sent what. There are two ways to collect.</Lead>

      <H2>Option A: permanent addresses</H2>
      <P>
        After you create a customer, Fluxel makes them one address per chain — Bitcoin, Ethereum, BNB Smart Chain and TRON. Anything sent there is credited to
        that customer. You’ll get <C>customer.wallets.ready</C> when they’re ready, or you can fetch them:
      </P>
      <Request
        method="GET"
        path="/customers/cus_01JC4Z8X2M7Q/addresses"
        response={[
          { chain: 'bitcoin', address: 'tb1q9h0yjdupyfpxfjg24rpx755xrplvzd9hz2nj7v' },
          { chain: 'ethereum', address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE' },
          { chain: 'bsc', address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE' },
          { chain: 'tron', address: 'TUCxqBvwq6VhrPUyrQ9BTAXnTVEBL9nh5M' },
        ]}
      />
      <Callout tone="info">The Ethereum and BNB Smart Chain addresses are the same. That’s expected — both chains use the same address format.</Callout>

      <H2>Option B: a deposit intent for a set amount</H2>
      <P>When you’re selling something with a price, create an intent. The chain is picked for you from the asset.</P>
      <Request
        method="POST"
        path="/customers/cus_01JC4Z8X2M7Q/crypto-deposit-intents"
        body={{ asset_code: 'USDT', expected_amount: '10000000' }}
        response={{
          id: 'cdi_01JC55A1T2YB',
          customer_id: 'cus_01JC4Z8X2M7Q',
          asset_code: 'USDT',
          status: 'pending',
          expected_amount: '10000000',
          received_amount: '0',
          confirmations: 0,
          required_confirmations: 12,
          address: null,
          expires_at: '2026-10-26T15:30:00Z',
          created_at: '2026-10-26T15:00:00Z',
        }}
      />
      <P>
        <C>address</C> fills in a moment later — poll <C>GET /crypto-deposit-intents/{'{id}'}</C> or stream <C>/events</C> on it. The status moves through{' '}
        <C>pending</C> → <C>ready</C> → <C>confirming</C> → <C>fulfilled</C> (or <C>underpaid</C> / <C>expired</C>).
      </P>

      <H2>Confirmations: pending vs available</H2>
      <P>Crypto arrives in two steps, and it’s important not to treat the first one as final:</P>
      <Table
        head={['Stage', 'Balance', 'Can it be spent?']}
        rows={[
          ['Seen on the blockchain', <span key="b">Shows in <C>pending</C></span>, 'No — it could still be reversed'],
          ['Enough confirmations', <span key="b">Moves to <C>available</C></span>, 'Yes'],
        ]}
      />
      <P>Ethereum and BNB Smart Chain need 12 blocks. Bitcoin needs 2, 3 or 6 confirmations depending on the size of the deposit.</P>

      <Callout tone="warn" title="Crypto webhooks aren’t delivered yet">
        Crypto deposit and withdrawal events aren’t sent to webhook endpoints yet. For now, check <C>GET /deposits?customer_id=…</C>, the customer’s balances,
        or the intent’s <C>/events</C> stream to see when crypto arrives.
      </Callout>
    </>
  );
}

function Payouts() {
  return (
    <>
      <Lead>Send Naira to any Nigerian bank account — from a customer’s balance, or from your business balance.</Lead>
      <Flow steps={['Pick the bank', 'Check the name', 'Create payout', 'Payout completed']} />

      <Steps>
        <Step title="Get the bank code">
          <Request method="GET" path="/banks" response={[{ code: '058', name: 'Guaranty Trust Bank' }, { code: '044', name: 'Access Bank' }]} />
          <P>The list rarely changes — cache it for a day.</P>
        </Step>

        <Step title="Confirm the account name">
          <P>Always show the account holder’s name and let your user confirm it before sending money. It stops payouts going to the wrong person.</P>
          <Request method="POST" path="/bank-accounts/resolve" body={{ bank_code: '058', account_number: '0123456789' }} response={{ account_name: 'ADA LOVELACE' }} />
        </Step>

        <Step title="Create the payout">
          <P>
            Include <C>customer_id</C> to pay from that customer’s balance. Leave it out to pay from your business balance.
          </P>
          <Request
            method="POST"
            path="/payouts"
            body={{ customer_id: 'cus_01JC4Z8X2M7Q', amount: '150000', bank_code: '058', account_number: '0123456789', account_name: 'ADA LOVELACE' }}
            response={{
              id: 'pay_01JC57DMB4XE',
              status: 'requested',
              amount: '150000',
              fee: '5000',
              destination: { bank_code: '058', account_number: '0123456789', account_name: 'ADA LOVELACE' },
            }}
          />
        </Step>

        <Step title="Wait for the result">
          <P>
            Bank transfers can take a little while. Listen for <C>fiat.payout.completed</C> or <C>fiat.payout.failed</C>, or check{' '}
            <C>GET /payouts/{'{id}'}</C>.
          </P>
        </Step>
      </Steps>

      <H2>Payout statuses</H2>
      <Table
        head={['Status', 'Meaning']}
        rows={[
          [<C key="s">requested</C>, 'Created and queued.'],
          [<C key="s">held</C>, 'Paused for a risk review. You’ll hear back by webhook.'],
          [<C key="s">approved</C>, 'Cleared review, about to be sent.'],
          [<C key="s">executing</C>, 'Sent to the bank.'],
          [<C key="s">completed</C>, 'The money arrived. Final.'],
          [<C key="s">failed</C>, 'The bank rejected it. The money is back in the balance.'],
          [<C key="s">rejected</C>, 'Declined at review. Nothing was sent.'],
          [<C key="s">uncertain</C>, 'The bank hasn’t confirmed either way yet. Fluxel keeps checking — don’t retry.'],
          [<C key="s">reversed</C>, 'Completed, then returned by the bank.'],
        ]}
      />

      <H2>Saved payout accounts</H2>
      <P>
        Paying the same accounts often? Save them with <C>POST /payout-accounts</C> (Fluxel checks the name for you), list them with{' '}
        <C>GET /payout-accounts</C>, and remove them with <C>DELETE /payout-accounts/{'{id}'}</C>.
      </P>
    </>
  );
}

function Withdrawals() {
  return (
    <>
      <Lead>Send crypto from a customer’s balance to any wallet address.</Lead>
      <Request
        method="POST"
        path="/crypto-withdrawals"
        body={{ customer_id: 'cus_01JC4Z8X2M7Q', chain: 'tron', asset_code: 'USDT-TRON', amount: '5000000', destination_address: 'TUCxqBvwq6VhrPUyrQ9BTAXnTVEBL9nh5M' }}
        response={{
          id: 'cwd_01JC5A0R8F6S',
          status: 'processing',
          chain: 'tron',
          asset_code: 'USDT-TRON',
          amount: '5000000',
          fee: '1000000',
          network_fee: null,
          destination_address: 'TUCxqBvwq6VhrPUyrQ9BTAXnTVEBL9nh5M',
          txid: null,
        }}
      />
      <P>
        <C>chain</C> is one of <C>bitcoin</C>, <C>ethereum</C>, <C>bsc</C> or <C>tron</C>, and <C>asset_code</C> must belong to that chain (see{' '}
        <To id="amounts">Amounts & assets</To>).
      </P>
      <Callout tone="info">
        <C>customer_id</C> is required. Withdrawing crypto straight from your business balance isn’t supported yet.
      </Callout>

      <H2>Statuses</H2>
      <Table
        head={['Status', 'Meaning']}
        rows={[
          [<C key="s">processing</C>, 'Being prepared and signed.'],
          [<C key="s">pending_review</C>, 'Held for a risk review.'],
          [<C key="s">broadcast</C>, <span key="m">Sent to the network. <C>txid</C> is now set.</span>],
          [<C key="s">confirmed</C>, 'Confirmed on-chain. Final.'],
          [<C key="s">failed</C>, 'Didn’t go through. The money is back in the balance.'],
          [<C key="s">rerouted_internal</C>, 'The address belongs to another Fluxel customer, so it was done as an instant internal transfer instead — no network fee.'],
        ]}
      />
      <Callout tone="warn" title="No webhooks for withdrawals yet">
        Withdrawal events aren’t delivered to webhook endpoints yet. Check progress with <C>GET /crypto-withdrawals/{'{id}'}</C>.
      </Callout>
    </>
  );
}

function Transfers() {
  return (
    <>
      <Lead>
        Move money from one of your customers to another — instantly, with no bank or blockchain involved. Perfect for marketplaces, where a buyer pays a
        seller.
      </Lead>
      <Request
        method="POST"
        path="/transfers"
        body={{ from_customer_id: 'cus_01JC4Z8X2M7Q', to_customer_id: 'cus_01JC4Z9F3RHA', asset_code: 'NGN', amount: '50000', fee: { business_fee: '1000' } }}
        response={{ id: 'trf_01JC5C1VY0QK', status: 'completed', amount: '50000', business_fee: '1000', fluxel_fee: '0' }}
      />
      <List>
        <li>Transfers complete straight away — the response already says <C>completed</C>.</li>
        <li>
          <C>fee.business_fee</C> is optional: your own cut, moved to your business balance. <C>fluxel_fee</C> is what Fluxel charges.
        </li>
        <li>
          You’ll also get a <C>ledger.transfer.completed</C> webhook. List past transfers with <C>GET /transfers?customer_id=…</C>.
        </li>
      </List>
    </>
  );
}

function Webhooks() {
  const { base } = useDocs();
  return (
    <>
      <Lead>
        Webhooks are how Fluxel tells your server that something happened — money arrived, a payout finished — the moment it happens. They’re the most reliable
        way to keep your app in sync.
      </Lead>

      <H2>1. Add an endpoint</H2>
      <P>
        The easiest way is <strong className="text-ink font-medium">Developers → Webhooks → Add endpoint</strong>. You can also do it with the API. Use{' '}
        <C>{'["*"]'}</C> to receive every event.
      </P>
      <Request
        method="POST"
        path="/webhook-endpoints"
        body={{ url: 'https://yourapp.com/webhooks/fluxel', events: ['fiat.deposit.settled', 'fiat.payout.completed', 'fiat.payout.failed'] }}
        response={{ id: 'whe_01JC5DX7N2ZC', secret: 'q9n2Yk1bW4f0bW2gk3Q2m3w8cH0p2Jt7XjLr6l5yS9o=' }}
      />
      <Callout tone="warn" title="Save the secret now">
        The signing secret is shown only once. You need it to verify every event. URLs must use HTTPS, and you can have up to 5 endpoints.
      </Callout>

      <H2>2. What you’ll receive</H2>
      <P>
        Fluxel sends a <C>POST</C> with a JSON body like this. <C>data</C> changes with the event type — see <To id="events">Event types</To>.
      </P>
      <Json
        label="Webhook body"
        value={{
          id: 'evt_01JC5F0J6GQ2',
          type: 'fiat.deposit.settled',
          created: '2026-10-26T15:04:12+00:00',
          business_id: 'biz_01JB8M3Q2VZ4',
          livemode: false,
          data: {
            deposit_id: 'fdep_01JC5F0HZ1KM',
            deposit_intent_id: 'fdi_01JC4ZB0K9TR',
            customer_id: 'cus_01JC4Z8X2M7Q',
            amount: '250000',
            fee: '2500',
            provider: 'lenco',
            provider_ref: 'LNC-88213409',
          },
        }}
      />
      <Table
        head={['Header', 'Contains']}
        rows={[
          [<C key="h">Fluxel-Signature</C>, <span key="v">A timestamp and signature: <C>t=1761491052,v1=5f8a…</C></span>],
          [<C key="h">Fluxel-Event-Id</C>, <span key="v">The same value as <C>id</C> in the body.</span>],
        ]}
      />

      <H2>3. Verify the signature</H2>
      <P>Anyone can send a request to your URL. Checking the signature proves it really came from Fluxel and wasn’t changed. The recipe:</P>
      <List>
        <li>
          Base64-decode your signing secret into raw bytes. <strong className="text-ink font-medium">This step is easy to miss</strong> — the HMAC key is the
          decoded bytes, not the text you copied.
        </li>
        <li>
          Read <C>t</C> and every <C>v1</C> from the <C>Fluxel-Signature</C> header.
        </li>
        <li>Reject the request if <C>t</C> is more than 5 minutes away from now — that blocks replayed requests.</li>
        <li>
          Compute HMAC-SHA256 of <C>{'{t}.{raw body}'}</C> and hex-encode it. Use the raw body exactly as received — parsing and re-serialising the JSON
          changes the bytes.
        </li>
        <li>Compare it with each <C>v1</C> using a constant-time comparison. Accept if any one matches.</li>
      </List>
      <LangCode
        code={{
          node: `import crypto from 'node:crypto';
import express from 'express';

const app = express();
// The secret you saved when adding the endpoint, decoded from base64.
const secret = Buffer.from(process.env.FLUXEL_WEBHOOK_SECRET, 'base64');

// express.raw keeps the exact bytes Fluxel signed.
app.post('/webhooks/fluxel', express.raw({ type: 'application/json' }), (req, res) => {
  const parts = (req.get('Fluxel-Signature') ?? '').split(',').map((p) => p.trim().split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);

  // Older than 5 minutes? Treat it as a replay.
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return res.sendStatus(400);

  const expected = crypto.createHmac('sha256', secret).update(\`\${timestamp}.\`).update(req.body).digest('hex');
  const valid = signatures.some(
    (sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  );
  if (!valid) return res.sendStatus(400);

  const event = JSON.parse(req.body.toString('utf8'));
  res.sendStatus(200); // reply first, then do the work
  handleEvent(event).catch(console.error);
});`,
          python: `import base64, hashlib, hmac, json, os, time
from flask import Flask, abort, request

app = Flask(__name__)
# The secret you saved when adding the endpoint, decoded from base64.
SECRET = base64.b64decode(os.environ["FLUXEL_WEBHOOK_SECRET"])

@app.post("/webhooks/fluxel")
def fluxel_webhook():
    raw = request.get_data()  # the exact bytes Fluxel signed
    parts = [p.strip().split("=", 1) for p in request.headers.get("Fluxel-Signature", "").split(",") if "=" in p]
    timestamp = next((v for k, v in parts if k == "t"), None)
    signatures = [v for k, v in parts if k == "v1"]

    # Older than 5 minutes? Treat it as a replay.
    if not timestamp or abs(time.time() - int(timestamp)) > 300:
        abort(400)

    expected = hmac.new(SECRET, f"{timestamp}.".encode() + raw, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, sig) for sig in signatures):
        abort(400)

    handle_event(json.loads(raw))  # keep this quick, or hand off to a queue
    return "", 200`,
        }}
      />

      <H2>4. Reply quickly</H2>
      <P>
        Return any <C>2xx</C> status within <strong className="text-ink font-medium">10 seconds</strong>. Anything else — including a redirect — counts as a
        failed delivery. Do slow work (emails, database jobs) after you reply.
      </P>

      <H2>Good habits</H2>
      <List>
        <li>
          <strong className="text-ink font-medium">Expect duplicates.</strong> Store each event’s <C>id</C> and skip ones you’ve already handled.
        </li>
        <li>
          <strong className="text-ink font-medium">Don’t rely on order.</strong> Events can arrive out of order. Treat each as a fact about one object, and
          when in doubt fetch the latest state (e.g. <C>GET /payouts/{'{id}'}</C>).
        </li>
        <li>
          <strong className="text-ink font-medium">Check </strong>
          <C>livemode</C> — it’s <C>false</C> for sandbox events, so test traffic can never be mistaken for real money.
        </li>
      </List>

      <H2>Failed deliveries</H2>
      <Callout tone="warn" title="No automatic retries yet">
        Today Fluxel tries each delivery once. If your server is down or replies with an error, that delivery is marked <C>exhausted</C> and isn’t retried
        automatically. Automatic retries are planned.
      </Callout>
      <P>To recover missed events:</P>
      <List>
        <li>
          In the dashboard, open <strong className="text-ink font-medium">Deliveries</strong> on the endpoint and press <strong className="text-ink font-medium">Resend</strong>.
        </li>
        <li>
          Or find them with <C>GET /webhook-deliveries?endpoint_id=…</C> and call <C>POST /webhook-deliveries/{'{id}'}/replay</C>. A replay keeps the same
          event <C>id</C>, so your duplicate check still works.
        </li>
      </List>
      <CodeBlock code={`curl -X POST ${base}/v1/webhook-deliveries/whd_01JC5G7P/replay \\\n  -H "Authorization: Bearer $FLUXEL_SECRET_KEY" \\\n  -H "Idempotency-Key: $(uuidgen)"`} />
    </>
  );
}

interface EventDoc {
  type: string;
  when: string;
  data: string[];
}

const DELIVERED_EVENTS: { group: string; events: EventDoc[] }[] = [
  {
    group: 'Naira payments',
    events: [
      { type: 'fiat.deposit_intent.ready', when: 'The account number for a deposit intent is ready to show.', data: ['intent_id', 'customer_id', 'account_number', 'bank_name', 'account_name', 'expires_at'] },
      { type: 'fiat.deposit.settled', when: 'Money arrived and was credited to the customer. Credit your user now.', data: ['deposit_id', 'deposit_intent_id', 'customer_id', 'amount', 'fee', 'provider', 'provider_ref'] },
      { type: 'fiat.deposit_intent.underpaid', when: 'The customer paid less than expected. Fluxel reviews it.', data: ['intent_id', 'expected_amount', 'amount_received', 'provider_ref'] },
      { type: 'fiat.deposit_intent.resolved', when: 'An underpayment was sorted out.', data: ['intent_id', 'resolution (credited | refunded | written_off)', 'actor'] },
      { type: 'fiat.deposit_intent.expired', when: 'Nobody paid within 30 minutes.', data: ['intent_id'] },
      { type: 'fiat.deposit_intent.failed', when: 'The account number couldn’t be created.', data: ['intent_id', 'reason'] },
      { type: 'fiat.refund.initiated', when: 'Fluxel started refunding an overpayment.', data: ['refund_id', 'intent_id', 'amount'] },
      { type: 'fiat.refund.completed', when: 'The refund reached the payer.', data: ['refund_id', 'provider_ref'] },
      { type: 'fiat.refund.failed', when: 'The refund didn’t go through.', data: ['refund_id', 'reason'] },
      { type: 'fiat.business_topup.settled', when: 'Money landed in your business balance.', data: ['topup_id', 'amount', 'fee', 'provider_ref'] },
    ],
  },
  {
    group: 'Payouts',
    events: [
      { type: 'fiat.payout.processing', when: 'The payout was sent to the bank.', data: ['payout_id', 'amount', 'fee', 'destination_bank_code', 'destination_account_number', 'destination_account_name'] },
      { type: 'fiat.payout.pending_review', when: 'The payout is held for a risk review.', data: ['payout_id', 'rule_ids'] },
      { type: 'fiat.payout.completed', when: 'The money arrived in the bank account.', data: ['payout_id', 'provider_ref'] },
      { type: 'fiat.payout.failed', when: 'The bank rejected the payout. The balance was restored.', data: ['payout_id', 'reason'] },
      { type: 'fiat.payout.rejected', when: 'The payout was declined at review.', data: ['payout_id', 'reason'] },
    ],
  },
  {
    group: 'Customers & transfers',
    events: [
      { type: 'customer.wallets.ready', when: 'A new customer’s crypto addresses are ready.', data: ['customer_id', 'addresses[{chain, address}]'] },
      { type: 'ledger.transfer.completed', when: 'A transfer between two customers finished.', data: ['transfer_id', 'from_customer_id', 'to_customer_id', 'asset_code', 'amount', 'business_fee', 'fluxel_fee'] },
      { type: 'ledger.transfer.pending_review', when: 'A transfer is held for review.', data: ['transfer_id', 'rule_ids'] },
      { type: 'ledger.transfer.rejected', when: 'A transfer was declined.', data: ['transfer_id', 'reason'] },
    ],
  },
  {
    group: 'Testing',
    events: [{ type: 'ping', when: 'You pressed “Send test” on an endpoint.', data: [] }],
  },
];

const NOT_YET_DELIVERED = [
  'crypto.deposit.detected',
  'crypto.deposit.confirmed',
  'crypto.deposit.orphaned',
  'crypto.deposit_intent.fulfilled',
  'crypto.deposit_intent.underpaid',
  'crypto.withdrawal.broadcast',
  'crypto.withdrawal.confirmed',
  'crypto.withdrawal.failed',
  'customer.created',
  'customer.frozen',
  'customer.unfrozen',
  'business.kyb.approved',
  'business.kyb.rejected',
  'business.settlement_preference.updated',
];

function Events() {
  const { crypto } = useDocs();
  const pending = crypto ? NOT_YET_DELIVERED : NOT_YET_DELIVERED.filter((e) => !e.startsWith('crypto.'));
  return (
    <>
      <Lead>
        Every event your endpoints can receive, what it means, and what’s inside <C>data</C>. Event names follow the pattern{' '}
        <C>area.object.what_happened</C>.
      </Lead>

      {DELIVERED_EVENTS.map((g) => (
        <section key={g.group}>
          <H2>{g.group}</H2>
          <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
            {g.events.map((e) => (
              <div key={e.type} className="px-4 py-3.5">
                <code className="font-mono text-[13px] font-medium text-ink">{e.type}</code>
                <p className="mt-1 text-[13.5px] leading-6 text-ink-2">{e.when}</p>
                {e.data.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.data.map((d) => (
                      <span key={d} className="h-6 px-2 inline-flex items-center rounded-md bg-subtle border border-line font-mono text-[11px] text-ink-3">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <H2>Not delivered yet</H2>
      <P>
        These events exist inside Fluxel, and you can tick them when adding an endpoint, but they aren’t sent to webhook endpoints yet. Use the API to check
        on these objects for now.
      </P>
      <div className="flex flex-wrap gap-1.5">
        {pending.map((e) => (
          <span key={e} className="h-6 px-2 inline-flex items-center rounded-md border border-dashed border-line-strong font-mono text-[11px] text-ink-3">
            {e}
          </span>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* API reference                                                       */
/* ------------------------------------------------------------------ */

interface Endpoint {
  m: Method;
  path: string;
  desc: string;
  crypto?: boolean;
}

const REFERENCE: { group: string; endpoints: Endpoint[] }[] = [
  {
    group: 'Customers',
    endpoints: [
      { m: 'POST', path: '/customers', desc: 'Create a customer' },
      { m: 'GET', path: '/customers', desc: 'List customers' },
      { m: 'GET', path: '/customers/{id}/balances', desc: 'A customer’s balances' },
      { m: 'GET', path: '/customers/{id}/addresses', desc: 'A customer’s crypto addresses', crypto: true },
      { m: 'POST', path: '/customers/{id}/freeze', desc: 'Freeze a customer — body: { reason }' },
      { m: 'POST', path: '/customers/{id}/unfreeze', desc: 'Unfreeze a customer — body: { reason }' },
    ],
  },
  {
    group: 'Naira collections',
    endpoints: [
      { m: 'POST', path: '/customers/{id}/fiat-deposit-intents', desc: 'Create a deposit intent' },
      { m: 'GET', path: '/fiat-deposit-intents/{id}', desc: 'Get a deposit intent' },
      { m: 'GET', path: '/fiat-deposit-intents/{id}/events', desc: 'Live status stream (Server-Sent Events)' },
      { m: 'POST', path: '/payment-links', desc: 'Create a payment link' },
      { m: 'GET', path: '/payment-links', desc: 'List payment links' },
      { m: 'GET', path: '/payment-links/{id}', desc: 'Get a payment link' },
      { m: 'POST', path: '/payment-links/{id}/void', desc: 'Void a payment link' },
    ],
  },
  {
    group: 'Crypto collections',
    endpoints: [
      { m: 'POST', path: '/customers/{id}/crypto-deposit-intents', desc: 'Create a crypto deposit intent', crypto: true },
      { m: 'GET', path: '/crypto-deposit-intents/{id}', desc: 'Get a crypto deposit intent', crypto: true },
      { m: 'GET', path: '/crypto-deposit-intents/{id}/events', desc: 'Live status stream (Server-Sent Events)', crypto: true },
    ],
  },
  {
    group: 'Payouts & withdrawals',
    endpoints: [
      { m: 'GET', path: '/banks', desc: 'List banks and their codes' },
      { m: 'POST', path: '/bank-accounts/resolve', desc: 'Look up an account name' },
      { m: 'POST', path: '/payouts', desc: 'Send Naira to a bank account' },
      { m: 'GET', path: '/payouts/{id}', desc: 'Get a payout' },
      { m: 'POST', path: '/payout-accounts', desc: 'Save a payout account' },
      { m: 'GET', path: '/payout-accounts', desc: 'List saved payout accounts' },
      { m: 'DELETE', path: '/payout-accounts/{id}', desc: 'Remove a saved payout account' },
      { m: 'POST', path: '/crypto-withdrawals', desc: 'Send crypto to a wallet', crypto: true },
      { m: 'GET', path: '/crypto-withdrawals/{id}', desc: 'Get a crypto withdrawal', crypto: true },
    ],
  },
  {
    group: 'Transfers',
    endpoints: [
      { m: 'POST', path: '/transfers', desc: 'Move money between two customers' },
      { m: 'GET', path: '/transfers', desc: 'List transfers' },
      { m: 'GET', path: '/transfers/{id}', desc: 'Get a transfer' },
    ],
  },
  {
    group: 'Balances & history',
    endpoints: [
      { m: 'GET', path: '/balances', desc: 'Your business balance per asset' },
      { m: 'GET', path: '/transactions', desc: 'Every deposit, payout, transfer and withdrawal' },
      { m: 'GET', path: '/deposits', desc: 'List deposits' },
      { m: 'GET', path: '/refunds', desc: 'List refunds' },
      { m: 'GET', path: '/refunds/{id}', desc: 'Get a refund' },
      { m: 'GET', path: '/reports/settlement-summary', desc: 'Totals for a date range (from, to)' },
      { m: 'GET', path: '/fees/preview', desc: 'Preview a fee (operation, amount)' },
      { m: 'GET', path: '/assets', desc: 'Supported assets and decimals' },
    ],
  },
  {
    group: 'Your business',
    endpoints: [
      { m: 'GET', path: '/business/static-account', desc: 'Your permanent top-up account' },
      { m: 'POST', path: '/business/topup-intents', desc: 'One-off top-up account for an amount' },
      { m: 'GET', path: '/business/topup-intents/{id}', desc: 'Get a top-up intent' },
      { m: 'GET', path: '/business/kyb-tier', desc: 'Your verification tier' },
      { m: 'GET', path: '/business/settlement-preference', desc: 'How your balance is settled' },
      { m: 'PUT', path: '/business/settlement-preference', desc: 'Change it — accumulate or auto_transfer' },
      { m: 'GET', path: '/checkout-config', desc: 'Hosted checkout branding' },
      { m: 'PUT', path: '/checkout-config', desc: 'Update checkout branding' },
    ],
  },
  {
    group: 'Disputes',
    endpoints: [
      { m: 'POST', path: '/disputes', desc: 'Open a dispute — body: { transaction_id, reason }' },
      { m: 'GET', path: '/disputes', desc: 'List disputes' },
      { m: 'GET', path: '/disputes/{id}', desc: 'Get a dispute' },
    ],
  },
  {
    group: 'Webhooks',
    endpoints: [
      { m: 'POST', path: '/webhook-endpoints', desc: 'Add an endpoint' },
      { m: 'GET', path: '/webhook-endpoints', desc: 'List endpoints' },
      { m: 'DELETE', path: '/webhook-endpoints/{id}', desc: 'Disable an endpoint' },
      { m: 'POST', path: '/webhook-endpoints/{id}/test', desc: 'Send a test ping' },
      { m: 'GET', path: '/webhook-deliveries', desc: 'List deliveries (endpoint_id)' },
      { m: 'POST', path: '/webhook-deliveries/{id}/replay', desc: 'Resend a delivery' },
    ],
  },
  {
    group: 'Sandbox only',
    endpoints: [{ m: 'POST', path: '/sandbox/simulate/fiat-deposit', desc: 'Simulate a Naira payment' }],
  },
];

function Reference() {
  const { base, crypto } = useDocs();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const groups = REFERENCE.map((g) => ({
    ...g,
    endpoints: g.endpoints.filter((e) => (crypto || !e.crypto) && (!q || `${e.m} ${e.path} ${e.desc}`.toLowerCase().includes(q))),
  })).filter((g) => g.endpoints.length > 0);

  return (
    <>
      <Lead>
        Every endpoint at a glance. Paths are relative to <C>{`${base}/v1`}</C>. The guides show full requests and responses for the ones you’ll use
        most.
      </Lead>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-3">
        <span className="inline-flex items-center gap-2">
          <MethodBadge method="GET" /> works with a publishable or secret key
        </span>
        <span className="inline-flex items-center gap-2">
          <MethodBadge method="POST" /> needs a secret key
        </span>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter endpoints — e.g. payout"
        aria-label="Filter endpoints"
        className={cx(selectClass, 'mt-5 cursor-text')}
      />
      {groups.length === 0 && <P>No endpoints match “{query}”.</P>}
      {groups.map((g) => (
        <section key={g.group}>
          <h2 className="mt-8 mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-ink-3">{g.group}</h2>
          <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden bg-surface">
            {g.endpoints.map((e) => (
              <li key={`${e.m} ${e.path}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <MethodBadge method={e.m} />
                <code className="font-mono text-[12.5px] text-ink break-all sm:flex-1">{e.path}</code>
                <span className="basis-full sm:basis-auto sm:text-right text-[13px] text-ink-3">{e.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

const PAGES: Record<SectionId, () => React.ReactElement> = {
  introduction: Introduction,
  quickstart: QuickStart,
  authentication: Authentication,
  sandbox: Sandbox,
  amounts: Amounts,
  requests: Requests,
  errors: Errors,
  naira: Naira,
  'payment-links': PaymentLinks,
  crypto: Crypto,
  payouts: Payouts,
  withdrawals: Withdrawals,
  transfers: Transfers,
  webhooks: Webhooks,
  events: Events,
  reference: Reference,
};

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

/*
 * The section lives in the URL hash (`/docs#payouts`) and the code language in
 * localStorage. Both are read as external stores, so the server render (no
 * hash, no storage) and the first client render agree — same approach as
 * lib/theme.ts.
 */

function subscribeHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => decodeURIComponent(window.location.hash.replace(/^#/, ''));

const LANG_EVENT = 'fluxel:docs-lang-changed';

function subscribeLang(onChange: () => void): () => void {
  window.addEventListener(LANG_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(LANG_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'curl' || saved === 'node' || saved === 'python') return saved;
  } catch {}
  return 'curl';
}

/** Show a section: the hash is the source of truth, so this just moves it. */
function go(id: SectionId) {
  window.location.hash = id;
  window.scrollTo({ top: 0 });
}

function writeLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  window.dispatchEvent(new Event(LANG_EVENT));
}

/** The whole `/docs` page. `apiBase` is the Fluxel API host, read on the server. */
export default function DeveloperDocs({ apiBase }: { apiBase: string }) {
  const crypto = useCryptoEnabled();
  const base = apiBase || 'https://your-fluxel-api';
  const section = useSyncExternalStore(subscribeHash, readHash, () => '');
  const lang = useSyncExternalStore(subscribeLang, readLang, (): Lang => 'curl');
  const theme = useTheme();

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => crypto || !i.crypto) }));
  const flat = groups.flatMap((g) => g.items);
  const current = flat.find((i) => i.id === section) ?? flat[0];
  const index = flat.indexOf(current);
  const prev = flat[index - 1];
  const next = flat[index + 1];
  const Page = PAGES[current.id];

  return (
    <Ctx.Provider value={{ base, lang, setLang: writeLang, go, crypto }}>
      <div className="min-h-svh bg-canvas">
      <header className="sticky top-0 z-20 h-14 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 flex items-center gap-3">
          <button type="button" onClick={() => go('introduction')} className="flex items-center gap-2.5 min-w-0 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fluxel_logo.png" alt="" className="size-7 rounded-lg object-cover ring-1 ring-brand/30" />
            <span className="font-semibold tracking-tight text-ink">Fluxel</span>
            <span aria-hidden className="h-5 w-px bg-line" />
            <span className="text-sm text-ink-2 truncate">Developer docs</span>
          </button>
          <nav aria-label="Docs links" className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleTheme(theme)}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg text-ink-3 hover:text-gold hover:bg-subtle cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link href="/#developers" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line bg-surface text-sm font-medium text-ink hover:bg-subtle">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-10 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Docs" className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="px-2.5 mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">{g.label}</p>
                <ul className="space-y-0.5">
                  {g.items.map((item) => {
                    const active = item.id === current.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => go(item.id)}
                          className={cx(
                            'w-full h-8 px-2.5 inline-flex items-center gap-2.5 rounded-lg text-[13.5px] text-left cursor-pointer transition-colors',
                            active ? 'bg-gold-soft text-ink font-medium' : 'text-ink-2 hover:bg-subtle hover:text-ink'
                          )}
                        >
                          <item.icon className={cx('size-4 shrink-0', active ? 'text-gold' : 'text-ink-3')} />
                          <span className="truncate">{item.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <label className="lg:hidden block mb-6">
            <span className="sr-only">Docs section</span>
            <select value={current.id} onChange={(e) => go(e.target.value as SectionId)} className={selectClass}>
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <article className="max-w-3xl pb-10">
            <p className="text-[12.5px] font-medium text-gold">{groups.find((g) => g.items.includes(current))?.label}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{current.title}</h1>
            <Page />

            <div className="mt-14 pt-6 border-t border-line grid grid-cols-2 gap-3">
              {prev ? (
                <button type="button" onClick={() => go(prev.id)} className="group text-left rounded-xl border border-line px-4 py-3 hover:border-line-strong hover:bg-subtle cursor-pointer">
                  <span className="flex items-center gap-1.5 text-xs text-ink-3">
                    <ArrowLeft className="size-3.5" /> Previous
                  </span>
                  <span className="block mt-0.5 text-sm font-medium text-ink">{prev.title}</span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button type="button" onClick={() => go(next.id)} className="group text-right rounded-xl border border-line px-4 py-3 hover:border-line-strong hover:bg-subtle cursor-pointer">
                  <span className="flex items-center justify-end gap-1.5 text-xs text-ink-3">
                    Next <ArrowRight className="size-3.5" />
                  </span>
                  <span className="block mt-0.5 text-sm font-medium text-ink">{next.title}</span>
                </button>
              )}
            </div>
          </article>
        </div>
      </div>
      </div>
    </Ctx.Provider>
  );
}
