'use client';

import React, { useState } from 'react';
import { TeamMember, UserSession } from '../../types/dashboard';
import { UserCheck, Shield, Laptop, Trash2, UserPlus, CheckCircle2 } from 'lucide-react';

interface TeamViewProps {
  teamMembers: TeamMember[];
  sessions: UserSession[];
  onInviteMember: (name: string, email: string, role: TeamMember['role']) => void;
  onRevokeSession: (sessionId: string) => void;
}

export default function TeamView({
  teamMembers,
  sessions,
  onInviteMember,
  onRevokeSession,
}: TeamViewProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Developer');

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    onInviteMember(inviteName, inviteEmail, inviteRole);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Section 1: Team Members & RBAC */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Team Directory & RBAC Roles</h3>
            <p className="text-xs text-slate-500 font-medium">Role grants per Doc 8 §4 matrix (Owner, Admin, Developer, Finance, Support)</p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs fast-transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {teamMembers.map((member) => (
            <div key={member.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg fast-transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {member.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{member.name}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{member.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px] uppercase">
                  {member.role}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-medium">{member.totp_enabled ? 'TOTP Enrolled' : 'Pending TOTP'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Active User Sessions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Active Dashboard Sessions</h3>
        <div className="divide-y divide-slate-100">
          {sessions.map((ses) => (
            <div key={ses.id} className="py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="font-bold text-slate-900 block">{ses.device}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{ses.ip_address} · {ses.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {ses.is_current ? (
                  <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase">
                    Current Session
                  </span>
                ) : (
                  <button
                    onClick={() => onRevokeSession(ses.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold fast-transition cursor-pointer"
                  >
                    Revoke Session
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Invite Team Member</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="alex@acmefintech.io"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                >
                  <option value="Admin">Admin (Full access except owner transfer)</option>
                  <option value="Developer">Developer (API keys, webhooks, transactions)</option>
                  <option value="Finance">Finance (Payouts, withdrawals, balances)</option>
                  <option value="Support">Support (Read-only customer inspection)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Send Invitation Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
