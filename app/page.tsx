'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import AuthView from './components/auth/AuthView';
import Console from './components/console/Console';
import { fetchSession, logout as endSession } from './lib/auth';
import type { AuthSession } from './types/auth';

/** Marks a demo sign-in for this tab, so a refresh doesn't drop back to sign-in. */
const DEMO_KEY = 'fluxel_demo_session';

const DEMO_SESSION: AuthSession = {
  user: { id: 'usr_demo', email: 'ada@kazstores.ng', roles: ['owner'] },
  business: {
    id: 'biz_01JDEMO7KAZSTORES',
    name: 'Kaz Stores Ltd',
    status: 'active',
    tier_1: true,
    settlement_preference: 'accumulate',
  },
};

export default function App() {
  // Auth state. The tokens themselves are never here — they live in httpOnly
  // cookies the route handlers in app/api/auth/ own; this is only what the
  // dashboard renders. `authStatus` starts 'restoring' so a cold load with a
  // valid cookie doesn't flash the sign-in page before the session comes back.
  const [authStatus, setAuthStatus] = useState<'restoring' | 'signed-out' | 'signed-in'>('restoring');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const adoptSession = useCallback((next: AuthSession, demo = false) => {
    setSession(next);
    setIsDemo(demo);
    setAuthStatus('signed-in');
    try {
      if (demo) sessionStorage.setItem(DEMO_KEY, '1');
      else sessionStorage.removeItem(DEMO_KEY);
    } catch {
      // Private mode — the demo just won't survive a refresh.
    }
  }, []);

  // Cold-load session restore. The route handler rotates the refresh token
  // server-side if the 15-minute access token has lapsed, so this is the only
  // place the client has to think about token lifetime at all.
  useEffect(() => {
    let cancelled = false;

    let demo = false;
    try {
      demo = sessionStorage.getItem(DEMO_KEY) === '1';
    } catch {}
    if (demo) {
      // Deferred a tick so the state update lands outside the effect body.
      queueMicrotask(() => !cancelled && adoptSession(DEMO_SESSION, true));
      return () => {
        cancelled = true;
      };
    }

    fetchSession()
      .then((result) => {
        if (cancelled) return;
        if (result.authenticated) {
          adoptSession({ user: result.user, business: result.business });
        } else {
          setAuthStatus('signed-out');
        }
      })
      .catch(() => {
        if (!cancelled) setAuthStatus('signed-out');
      });

    return () => {
      cancelled = true;
    };
  }, [adoptSession]);

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(DEMO_KEY);
    } catch {}
    // Sign out locally whatever the API says — a revoke that fails must still
    // leave the browser signed out.
    try {
      if (!isDemo) await endSession();
    } finally {
      setSession(null);
      setIsDemo(false);
      setAuthStatus('signed-out');
      history.replaceState(null, '', window.location.pathname);
    }
  };

  if (authStatus === 'restoring') {
    return (
      <div className="min-h-svh flex items-center justify-center bg-canvas">
        <Loader2 className="w-6 h-6 animate-spin text-ink-3" aria-label="Restoring your session" />
      </div>
    );
  }

  if (authStatus !== 'signed-in' || !session) {
    return (
      <AuthView
        onAuthenticated={(s) => adoptSession(s)}
        onExploreDemo={() => adoptSession(DEMO_SESSION, true)}
      />
    );
  }

  return <Console session={session} isDemo={isDemo} onLogout={handleLogout} />;
}
