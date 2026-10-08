'use client';

import { useEffect } from 'react';

function safeReturnUrl(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

function tokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export default function PortalHandoffPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = safeReturnUrl(params.get('returnUrl'));
    const token = localStorage.getItem('token');

    if (!token || tokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    const rawAdminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:4200/app';
    let adminBase = rawAdminUrl.replace(/\/+$/, '');
    if (!/\/app$/.test(adminBase)) adminBase = `${adminBase}/app`;
    window.location.replace(`${adminBase}/auth/login-token?token=${encodeURIComponent(token)}&returnUrl=${encodeURIComponent(returnUrl)}`);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-xl border bg-white px-6 py-5 text-center shadow-sm">
        <h1 className="font-semibold text-slate-900">Opening NeoZaar Portal</h1>
        <p className="mt-2 text-sm text-slate-500">Checking your existing session…</p>
      </div>
    </main>
  );
}
