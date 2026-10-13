'use client';

import React, { useState } from 'react';
import { Check, Minus, UserPlus } from 'lucide-react';

import { dash, invalidate } from '../../lib/console/client';
import { useTeam } from '../../lib/console/data';
import type { TeamMember } from '../../lib/console/models';
import { PERMISSION_ROWS, ROLES, ROLE_LABEL, ROLE_SUMMARY, can, isRole, type Role } from '../../lib/permissions';
import type { Notify } from './nav';
import {
  AsyncButton,
  Avatar,
  Button,
  Card,
  CardHeader,
  CopyField,
  ErrorState,
  Field,
  LoadingRows,
  Modal,
  controlClass,
  cx,
  inputClass,
} from './ui';

const selectClass = cx(controlClass, 'h-9 !w-auto pr-8 sm:text-sm cursor-pointer');

function InviteModal({
  actingRole,
  existing,
  onClose,
  onInvited,
}: {
  actingRole: string;
  existing: TeamMember[];
  onClose: () => void;
  onInvited: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('developer');
  const [error, setError] = useState<string | null>(null);
  // Only an owner can make another owner (Doc 8 §4: admins can't transfer ownership).
  const grantable = ROLES.filter((r) => r !== 'owner' || actingRole === 'owner');
  const trimmed = email.trim().toLowerCase();
  const dupe = existing.some((m) => m.email.toLowerCase() === trimmed);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !dupe;

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite a teammate"
      description="They’ll sign in with their email and a temporary password you share with them."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <AsyncButton
            variant="primary"
            disabled={!valid}
            onClick={async () => {
              setError(null);
              try {
                const created = await dash.post<TeamMember & { temp_password?: string }>('team', { email: trimmed, role });
                invalidate('team');
                onInvited(trimmed, created.temp_password ?? '');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not invite them.');
              }
            }}
          >
            Invite
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Work email" htmlFor="invite-email" error={dupe ? 'They’re already on your team.' : undefined}>
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
          <div className="grid sm:grid-cols-2 gap-2">
            {grantable.map((r) => (
              <label
                key={r}
                className={cx(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  role === r ? 'border-gold ring-2 ring-brand/30 bg-gold-soft' : 'border-line hover:border-line-strong'
                )}
              >
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 accent-[var(--color-brand)]" />
                <span>
                  <span className="block text-sm font-medium text-ink">{ROLE_LABEL[r]}</span>
                  <span className="block text-xs text-ink-3">{ROLE_SUMMARY[r]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}

export default function TeamPage({ role, userEmail, notify }: { role: string; userEmail: string; notify: Notify }) {
  const team = useTeam();
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<{ email: string; password: string } | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const manage = can(role, 'team.manage');
  const me = userEmail.toLowerCase();

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          title="Members"
          description={team.data ? `${team.data.length} ${team.data.length === 1 ? 'person' : 'people'}` : undefined}
          actions={
            manage && (
              <Button variant="primary" size="sm" onClick={() => setInviting(true)}>
                <UserPlus className="size-4" />
                Invite
              </Button>
            )
          }
        />
        <div className="border-t border-line">
          {team.loading ? (
            <LoadingRows rows={3} />
          ) : team.error ? (
            <ErrorState message={team.error.message} onRetry={team.reload} />
          ) : (
            <ul className="divide-y divide-line">
              {team.data!.map((m) => {
                const isYou = m.email.toLowerCase() === me;
                // Owners are only edited by owners; nobody edits themselves.
                const editable = manage && !isYou && (m.role !== 'owner' || role === 'owner');
                const grantable = ROLES.filter((r) => r !== 'owner' || role === 'owner');
                return (
                  <li key={m.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3.5">
                    <Avatar name={m.email} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {m.email}
                        {isYou && <span className="ml-1.5 text-ink-3 font-normal">(you)</span>}
                      </p>
                      <p className="text-xs text-ink-3">{isRole(m.role) ? ROLE_SUMMARY[m.role] : m.role}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-12 sm:ml-0">
                      {editable ? (
                        <select
                          aria-label={`Role for ${m.email}`}
                          value={m.role}
                          onChange={async (e) => {
                            const next = e.target.value as Role;
                            try {
                              await dash.put(`team/${m.id}`, { role: next });
                              invalidate('team');
                              notify(`${m.email} is now ${ROLE_LABEL[next]}`);
                            } catch (err) {
                              notify(err instanceof Error ? err.message : 'Could not change the role', 'error');
                            }
                          }}
                          className={selectClass}
                        >
                          {grantable.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center h-9 px-3 text-sm text-ink-2">{isRole(m.role) ? ROLE_LABEL[m.role] : m.role}</span>
                      )}
                      {editable && (
                        <Button size="sm" variant="ghost" onClick={() => setRemoving(m)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Roles and permissions" description="What each role can do (Fluxel Doc 8 §4)." />
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left font-medium text-xs text-ink-3 px-5 py-3">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="font-medium text-xs text-ink-3 px-2 py-3 w-20 text-center">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSION_ROWS.map((p) => (
                <tr key={p.permission}>
                  <td className="px-5 py-3 text-ink">{p.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-2 py-3 text-center">
                      {can(r, p.permission) ? (
                        <Check className="inline size-4 text-gold" aria-label="Allowed" />
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

      {inviting && team.data && (
        <InviteModal
          actingRole={role}
          existing={team.data}
          onClose={() => setInviting(false)}
          onInvited={(email, password) => {
            setInviting(false);
            setInvited({ email, password });
          }}
        />
      )}

      {invited && (
        <Modal
          open
          onClose={() => setInvited(null)}
          title="Teammate added"
          description={`Share this temporary password with ${invited.email} directly — over a call or a password manager, not email. They should change it after signing in.`}
          footer={
            <Button variant="primary" onClick={() => setInvited(null)}>
              Done
            </Button>
          }
        >
          {invited.password ? <CopyField value={invited.password} secret /> : <p className="text-sm text-ink-2">Use the password you set for them.</p>}
        </Modal>
      )}

      {removing && (
        <Modal
          open
          onClose={() => setRemoving(null)}
          title={`Remove ${removing.email}?`}
          description="They lose access to this business straight away."
          footer={
            <>
              <Button onClick={() => setRemoving(null)}>Cancel</Button>
              <AsyncButton
                variant="danger"
                onClick={async () => {
                  try {
                    await dash.del(`team/${removing.id}`);
                    invalidate('team');
                    notify(`${removing.email} removed`);
                    setRemoving(null);
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not remove them', 'error');
                  }
                }}
              >
                Remove
              </AsyncButton>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </>
  );
}
