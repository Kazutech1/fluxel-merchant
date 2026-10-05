'use client';

import React, { useState } from 'react';
import { Check, Minus, UserPlus } from 'lucide-react';

import { formatRelativeInline } from '../../lib/console/format';
import type { ConsoleData, Role, TeamMember } from '../../lib/console/types';
import type { ConsoleActions } from '../../lib/console/useConsoleData';
import { Avatar, Button, Card, CardHeader, Field, Modal, PageHeader, Tag, controlClass, cx, inputClass } from './ui';

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  finance: 'Finance',
  viewer: 'Viewer',
};

const ROLE_SUMMARY: Record<Role, string> = {
  owner: 'Full control, including ownership',
  admin: 'Everything except ownership',
  finance: 'Withdraws and reconciles money',
  viewer: 'Can look, can’t change anything',
};

const ROLES: Role[] = ['owner', 'admin', 'finance', 'viewer'];

const PERMISSIONS: { label: string; roles: Role[] }[] = [
  { label: 'See balances, transactions and customers', roles: ['owner', 'admin', 'finance', 'viewer'] },
  { label: 'Export reports', roles: ['owner', 'admin', 'finance'] },
  { label: 'Withdraw money', roles: ['owner', 'admin', 'finance'] },
  { label: 'Add payout accounts and change payout settings', roles: ['owner', 'admin'] },
  { label: 'Invite and manage team members', roles: ['owner', 'admin'] },
  { label: 'Transfer ownership or close the account', roles: ['owner'] },
];

const selectClass = cx(controlClass, 'h-9 !w-auto pr-8 sm:text-sm cursor-pointer');

function InviteModal({
  onClose,
  onInvite,
  existing,
}: {
  onClose: () => void;
  onInvite: (name: string, email: string, role: Role) => void;
  existing: TeamMember[];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('finance');
  const [touched, setTouched] = useState(false);

  const trimmed = email.trim().toLowerCase();
  const error = !name.trim()
    ? 'Enter their name.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? 'Enter a valid email address.'
      : existing.some((m) => m.email.toLowerCase() === trimmed)
        ? 'This person is already on your team.'
        : null;

  const submit = () => {
    setTouched(true);
    if (error) return;
    onInvite(name.trim(), trimmed, role);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite a teammate"
      description="They'll get an email to set up their login."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Send invite
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <Field label="Full name" htmlFor="invite-name">
          <input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className={inputClass} />
        </Field>
        <Field label="Work email" htmlFor="invite-email" error={touched && error ? error : undefined}>
          <input
            id="invite-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@company.com"
            className={inputClass}
          />
        </Field>
        <fieldset>
          <legend className="block text-sm font-medium text-ink-2 mb-2">Role</legend>
          <div className="space-y-2">
            {ROLES.filter((r) => r !== 'owner').map((r) => (
              <label
                key={r}
                className={cx(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  role === r ? 'border-gold ring-2 ring-brand/30 bg-gold-soft' : 'border-line hover:border-line-strong'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="mt-0.5 accent-[var(--color-brand)]"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{ROLE_LABEL[r]}</span>
                  <span className="block text-xs text-ink-3">{ROLE_SUMMARY[r]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function TeamPage({
  data,
  store,
  role,
  notify,
  embedded = false,
}: {
  data: ConsoleData;
  store: ConsoleActions;
  role: Role;
  notify: (message: string) => void;
  /** Rendered inside Settings: no page header, invite sits on the card. */
  embedded?: boolean;
}) {
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const canManage = role === 'owner' || role === 'admin';

  const inviteButton = canManage && (
    <Button variant="primary" size={embedded ? 'sm' : 'md'} onClick={() => setInviting(true)}>
      <UserPlus className="size-4" />
      Invite
    </Button>
  );

  return (
    <>
      {!embedded && <PageHeader
        title="Team"
        description="Who can access this account, and what they can do."
        actions={inviteButton}
      />}

      <Card className="overflow-hidden">
        <CardHeader title="Members" description={`${data.team.length} people`} actions={embedded ? inviteButton : undefined} />
        <ul className="border-t border-line divide-y divide-line">
          {data.team.map((m) => {
            const editable = canManage && !m.isYou && m.role !== 'owner';
            return (
              <li key={m.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3.5">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {m.name}
                    {m.isYou && <span className="text-ink-3 font-normal">(you)</span>}
                    {m.status === 'invited' && <Tag>Invite sent</Tag>}
                  </p>
                  <p className="text-xs text-ink-3 truncate">{m.email}</p>
                </div>
                <span className="hidden md:block w-28 text-xs text-ink-3">
                  {m.status === 'invited' ? 'Not joined yet' : `Active ${formatRelativeInline(m.lastActiveAt)}`}
                </span>
                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                  {editable ? (
                    <select
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      onChange={(e) => {
                        const next = e.target.value as Role;
                        store.updateMemberRole(m.id, next);
                        notify(`${m.name}'s role changed to ${ROLE_LABEL[next]}`);
                      }}
                      className={selectClass}
                    >
                      {ROLES.filter((r) => r !== 'owner').map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center h-9 px-3 text-sm text-ink-2">{ROLE_LABEL[m.role]}</span>
                  )}
                  {editable && (
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(m)}>
                      {m.status === 'invited' ? 'Revoke' : 'Remove'}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Roles and permissions" description="What each role can do." />
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left font-medium text-xs text-ink-3 px-5 py-3">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="font-medium text-xs text-ink-3 px-3 py-3 w-24 text-center">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSIONS.map((p) => (
                <tr key={p.label}>
                  <td className="px-5 py-3 text-ink">{p.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-3 text-center">
                      {p.roles.includes(r) ? (
                        <Check className="inline size-4 text-ink" aria-label="Allowed" />
                      ) : (
                        <Minus className="inline size-4 text-line-strong" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {inviting && (
        <InviteModal
          existing={data.team}
          onClose={() => setInviting(false)}
          onInvite={(name, email, r) => {
            store.inviteMember(name, email, r);
            notify(`Invite sent to ${email}`);
          }}
        />
      )}

      {removing && (
        <Modal
          open
          onClose={() => setRemoving(null)}
          title={removing.status === 'invited' ? 'Revoke invite?' : `Remove ${removing.name}?`}
          description={
            removing.status === 'invited'
              ? `${removing.email} won't be able to use their invite link.`
              : `${removing.name} will lose access to this account straight away.`
          }
          footer={
            <>
              <Button onClick={() => setRemoving(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  store.removeMember(removing.id);
                  notify(removing.status === 'invited' ? 'Invite revoked' : `${removing.name} removed`);
                  setRemoving(null);
                }}
              >
                {removing.status === 'invited' ? 'Revoke invite' : 'Remove'}
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </>
  );
}
