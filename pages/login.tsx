import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { getSessionFromRequest, isAuthConfigured } from '../lib/auth';

type LoginProps = {
  isConfigured: boolean;
};

export const getServerSideProps: GetServerSideProps<LoginProps> = async ({ req }) => {
  const configured = isAuthConfigured();
  if (configured) {
    const session = getSessionFromRequest(req);
    if (session) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      isConfigured: configured,
    },
  };
};

export default function Login({ isConfigured }: LoginProps) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const router = useRouter();

  // Fetch CSRF token on mount
  const fetchCsrfToken = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf');
      if (response.ok) {
        const data = await response.json() as { token: string };
        setCsrfToken(data.token);
      }
    } catch {
      // CSRF fetch failed, will be handled on submit
    }
  }, []);

  useEffect(() => {
    if (isConfigured) {
      fetchCsrfToken();
    }
  }, [isConfigured, fetchCsrfToken]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured) return;
    setStatus('loading');
    setMessage('');
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      const response = await fetch('/api/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setStatus('error');
        if (data.error === 'rate_limit_exceeded') {
          setMessage('Too many attempts. Please wait before trying again.');
        } else if (data.error === 'csrf_validation_failed') {
          setMessage('Session expired. Refreshing...');
          await fetchCsrfToken();
        } else {
          setMessage('Invalid passcode. Please try again.');
        }
        return;
      }
      setStatus('idle');
      router.push('/');
    } catch (error) {
      setStatus('error');
      setMessage('Unable to sign in. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Sign in | API Usage Dashboard</title>
        <meta name="description" content="Sign in to access your API usage dashboard" />
      </Head>
      <div className="min-h-screen bg-claude-cream dark:bg-claude-dark-bg text-claude-text dark:text-claude-dark-text dark:text-claude-dark-text flex items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-8 shadow-claude-md">
          <h1 className="text-2xl font-semibold text-claude-text dark:text-claude-dark-text">Sign in</h1>
          <p className="text-sm text-claude-text dark:text-claude-dark-text-muted mt-2">Private access for your API usage metrics.</p>

          {!isConfigured && (
            <div className="mt-5 rounded-xl border border-claude-terracotta/40 bg-claude-terracotta/10 p-4 text-sm text-claude-terracotta-dark">
              <div className="font-medium">Setup required</div>
              <p className="mt-2 text-xs text-claude-text dark:text-claude-dark-text-muted">
                Set <code className="font-mono bg-claude-beige dark:bg-claude-dark-surface-hover px-1 rounded">AUTH_SECRET</code> and <code className="font-mono bg-claude-beige dark:bg-claude-dark-surface-hover px-1 rounded">DASHBOARD_PASSWORD</code> in <code className="font-mono bg-claude-beige dark:bg-claude-dark-surface-hover px-1 rounded">.env.local</code> to enable sign in.
              </p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="text-xs text-claude-text dark:text-claude-dark-text-muted font-medium uppercase tracking-wider">Passcode</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isConfigured}
                className="mt-2 w-full bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text px-4 py-2.5 rounded-xl border border-claude-border focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40 disabled:opacity-50 placeholder:text-claude-text dark:text-claude-dark-text-muted/60"
                placeholder="Enter your dashboard passcode"
              />
            </div>
            {message && <div className="text-xs text-claude-terracotta-dark">{message}</div>}
            <button
              type="submit"
              disabled={status === 'loading' || !isConfigured}
              className={`w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${status === 'loading' || !isConfigured ? 'bg-claude-beige dark:bg-claude-dark-surface-hover-dark text-claude-text dark:text-claude-dark-text-muted cursor-not-allowed' : 'bg-claude-terracotta text-white hover:bg-claude-terracotta-dark'}`}
            >
              {status === 'loading' ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
