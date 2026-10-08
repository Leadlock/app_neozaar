'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const setCookie = (name, value, days = 1) => {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getRedirectAfterLogin = () => {
  let raw = null;
  try { raw = sessionStorage.getItem('redirect_after_login'); } catch {}
  if (!raw) {
    const item = document.cookie.split('; ').find((entry) => entry.startsWith('redirect_after_login='));
    raw = item ? decodeURIComponent(item.split('=').slice(1).join('=')) : null;
  }
  try {
    const data = JSON.parse(raw);
    return typeof data?.url === 'string' && data.url.startsWith('/') ? data.url : null;
  } catch { return null; }
};

const clearRedirectAfterLogin = () => {
  try { sessionStorage.removeItem('redirect_after_login'); } catch {}
  document.cookie = 'redirect_after_login=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing your secure sign-in…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    if (error || !code) {
      setFailed(true);
      setMessage(error || 'The provider did not return a valid sign-in code.');
      return;
    }

    const exchange = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/').replace(/\/+$/, '');
        const response = await fetch(`${apiBase}/oauth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const payload = await response.json();
        if (!response.ok || payload.status !== 'success') throw new Error(payload.message || 'Sign-in failed');
        const { token, user } = payload.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setCookie('token', token);
        setCookie('user', JSON.stringify(user));
        setCookie('user_email', user.email);
        setCookie('user_role', String(user.role_id));
        setCookie('user_name', user.name || user.email.split('@')[0]);
        const redirectTo = getRedirectAfterLogin();
        clearRedirectAfterLogin();
        router.replace(redirectTo || '/');
      } catch (exchangeError) {
        setFailed(true);
        setMessage(exchangeError.message || 'We could not complete your sign-in.');
      }
    };
    exchange();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-8 text-center shadow-2xl">
        <Image src="/image/logo-s.png" alt="Neozaar" width={192} height={48} className="mx-auto mb-8 object-contain" />
        <div className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full ${failed ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'}`}>
          {failed ? <span className="text-2xl">!</span> : <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        </div>
        <h1 className="mb-2 text-xl font-semibold">{failed ? 'Sign-in unsuccessful' : 'Signing you in'}</h1>
        <p className="text-sm leading-6 text-zinc-400">{message}</p>
        {failed && (
          <button onClick={() => router.replace('/auth/login')} className="mt-6 w-full bg-gradient-to-r from-orange-500 to-orange-700 py-3 font-semibold">
            Return to login
          </button>
        )}
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return <Suspense fallback={null}><OAuthCallbackContent /></Suspense>;
}
