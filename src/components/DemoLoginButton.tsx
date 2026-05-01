'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DemoLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        className="btn btn-primary w-full"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch('/api/v1/auth/demo-login', { method: 'POST' });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j.error?.message ?? `HTTP ${res.status}`);
            }
            router.refresh();
            router.push('/');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? 'Signing in…' : 'Sign in as demo user'}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-priority-urgent">{error}</p>
      ) : null}
    </div>
  );
}
