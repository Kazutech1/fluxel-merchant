'use client';

import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Lock, Mail, ArrowRight, UserCheck, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (userRole: string, tokenType: 'dash' | 'admin') => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  
  // Form fields
  const [email, setEmail] = useState('sarah.jenkins@acmefintech.io');
  const [password, setPassword] = useState('••••••••••••');
  const [businessName, setBusinessName] = useState('Acme Fintech Solutions');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setStep('totp');
  };

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      setError('Please enter a valid 6-digit TOTP code (e.g. 123456).');
      return;
    }
    setError('');
    onLoginSuccess('Owner', 'dash');
  };

  const handleQuickLogin = (role: string, demoEmail: string) => {
    setEmail(demoEmail);
    onLoginSuccess(role, 'dash');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/fluxel_logo.png"
            alt="Fluxel Platform Logo"
            className="w-16 h-16 rounded-2xl object-cover mx-auto border-2 border-slate-200 shadow-lg"
          />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FLUXEL PLATFORM</h1>
          <p className="text-xs text-slate-500 font-medium">Merchant Business Dashboard Portal</p>
        </div>

        {/* Card Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6">
          {/* Mode Tabs: Login vs Register */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => {
                setAuthMode('login');
                setStep('credentials');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg fast-transition cursor-pointer ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setStep('credentials');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg fast-transition cursor-pointer ${
                authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Create Business Account
            </button>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Registered Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Acme Fintech Ltd"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Merchant Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.jenkins@acmefintech.io"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setError('Password reset instructions sent to your email.')}
                      className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remember this browser session</span>
                </label>
              </div>

              {error && <p className="text-xs text-indigo-600 font-medium bg-indigo-50 p-2.5 rounded border border-indigo-100">{error}</p>}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow flex items-center justify-center gap-2 fast-transition cursor-pointer"
              >
                <span>{authMode === 'login' ? 'Sign In & Verify TOTP' : 'Create Account & Begin KYB'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center space-y-1">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-fit mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">MFA Authenticator Step-Up</h3>
                <p className="text-xs text-slate-500">Enter 6-digit code from your authenticator app (e.g. 123456)</p>
              </div>

              <div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono tracking-widest text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  &larr; Back
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow cursor-pointer"
                >
                  Verify & Enter Dashboard
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Login Presets */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Quick Demo One-Click Logins
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('Owner', 'sarah.jenkins@acmefintech.io')}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-left text-xs fast-transition cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">Merchant Owner</span>
                <span className="text-[10px] text-slate-500 font-mono">sarah@acmefintech.io</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Developer', 'm.chen@acmefintech.io')}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-left text-xs fast-transition cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">Developer</span>
                <span className="text-[10px] text-slate-500 font-mono">m.chen@acmefintech.io</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
