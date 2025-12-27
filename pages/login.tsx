import { useState } from 'react';
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
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured) return;
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setStatus('error');
        setMessage('Invalid passcode. Please try again.');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 w-full max-w-md glass-card glass-border rounded-2xl p-6">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-slate-400 mt-2">Private access for your API usage metrics.</p>

          {!isConfigured && (
            <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              <div className="font-medium">Setup required</div>
              <p className="mt-2 text-xs text-amber-100">
                Set <code className="font-mono">AUTH_SECRET</code> and <code className="font-mono">DASHBOARD_PASSWORD</code> in <code className="font-mono">.env.local</code> to enable sign in.
              </p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="text-xs text-slate-400 font-medium uppercase tracking-wider">Passcode</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isConfigured}
                className="mt-2 w-full bg-slate-800/60 text-white px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
                placeholder="Enter your dashboard passcode"
              />
            </div>
            {message && <div className="text-xs text-red-400">{message}</div>}
            <button
              type="submit"
              disabled={status === 'loading' || !isConfigured}
              className={`w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${status === 'loading' || !isConfigured ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed' : 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30'}`}
            >
              {status === 'loading' ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
