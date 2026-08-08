'use client';

import React, { useState } from 'react';
import { TeamMember, UserSession } from '../../types/dashboard';
import { ShieldCheck, Plus, UserX, CheckCircle2, AlertCircle, Laptop, Smartphone, X } from 'lucide-react';

interface TeamViewProps {
  teamMembers: TeamMember[];
  sessions: UserSession[];
  onInviteMember: (name: string, email: string, role: string) => void;
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
  const [inviteRole, setInviteRole] = useState('Developer');

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    onInviteMember(inviteName, inviteEmail, inviteRole);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Directory Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Team Directory & RBAC Roles</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Role grants per Doc 8 §4 matrix (Owner, Admin, Developer, Finance, Support)
            </p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs fast-transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        </div>

        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {member.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 text-xs block truncate">{member.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono truncate block">{member.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/80">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {member.role}
                </span>

                {member.totp_enabled ? (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    TOTP Enrolled
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending TOTP
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Dashboard Sessions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Active Dashboard Sessions</h3>
        <div className="space-y-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg shrink-0">
                  {sess.device.includes('iPhone') ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 text-xs block truncate">{sess.device}</span>
                  <span className="text-[11px] text-slate-500 font-mono truncate block">
                    {sess.ip_address} · {sess.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                {sess.is_current ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded text-[10px] uppercase">
                    Current Session
                  </span>
                ) : (
                  <button
                    onClick={() => onRevokeSession(sess.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded text-xs fast-transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Invite Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Grant RBAC Role & Invite Link</p>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="alex.m@acmefintech.io"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="Admin">Admin (Full Operational Controls)</option>
                  <option value="Developer">Developer (API Keys & Webhooks)</option>
                  <option value="Finance">Finance (Payouts & Transfers)</option>
                  <option value="Support">Support (Read-Only Directory)</option>
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
                  className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
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
