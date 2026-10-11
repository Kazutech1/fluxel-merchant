'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import AuthView from './components/auth/AuthView';
import Console from './components/console/Console';
import { fetchSession, logout as endSession } from './lib/auth';
import type { AuthSession } from './types/auth';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'restoring' | 'signed-out' | 'signed-in'>('restoring');
  const [session, setSession] = useState<AuthSession | null>(null);

  const adoptSession = useCallback((next: AuthSession) => {
    setSession(next);
    setAuthStatus('signed-in');
  }, []);

  useEffect(() => {
    let cancelled = false;

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
      await endSession();
    } finally {
      setSession(null);
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
    return <AuthView onAuthenticated={(s) => adoptSession(s)} />;
  }

  return <Console session={session} onLogout={handleLogout} />;
}
