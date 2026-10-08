'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!token || !emailParam) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    setEmail(emailParam);

    const verify = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}user/verify-email?token=${token}&email=${encodeURIComponent(emailParam)}`,
          { redirect: 'follow' }
        );

        if (res.ok || res.redirected) {
          setStatus('success');
          setTimeout(() => { window.location.href = '/auth/login'; }, 2500);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired or already been used.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again or request a new verification link.');
      }
    };

    verify();
  }, [searchParams]);

  const handleResend = async () => {
    if (!email) return;
    setResendStatus('sending');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}user/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setResendStatus(res.ok ? 'sent' : 'failed');
      if (!res.ok) setMessage(data.message || 'Failed to resend. Please try again.');
    } catch {
      setResendStatus('failed');
    }
  };

  return (
    <div className="relative z-10 bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 md:p-12 max-w-md w-full text-center border border-gray-700">
      {status === 'verifying' && (
        <>
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Verifying your email...</h1>
          <p className="text-gray-400">Please wait a moment.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="flex justify-center mb-6">
            <div className="bg-[#F79331] rounded-full p-5 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-3">Email Verified!</h1>
          <p className="text-gray-300 mb-6">Your email has been verified successfully. Redirecting you to login...</p>
          <Link href="/auth/login" className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-[#F79331] to-[#CB5D18] text-white font-medium hover:opacity-90 transition">
            Go to Login
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="flex justify-center mb-6">
            <div className="bg-red-600 rounded-full p-5 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-3">Verification Failed</h1>
          <p className="text-gray-300 mb-6">{message}</p>

          {resendStatus === 'sent' ? (
            <p className="text-green-400 mb-4">A new verification email has been sent. Please check your inbox.</p>
          ) : (
            email && (
              <button
                onClick={handleResend}
                disabled={resendStatus === 'sending'}
                className="w-full mb-3 px-8 py-3 rounded-lg bg-gradient-to-r from-[#F79331] to-[#CB5D18] text-white font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {resendStatus === 'sending' ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )
          )}

          <Link href="/auth/login" className="inline-block text-gray-400 hover:text-white text-sm transition">
            Back to Login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main
      className="relative min-h-screen flex items-center justify-center text-white p-4"
      style={{ fontFamily: "'Creato Display', sans-serif" }}
    >
      <div className="absolute inset-0 bg-[url('/image.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/60" />
      <Suspense fallback={
        <div className="relative z-10 bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 md:p-12 max-w-md w-full text-center border border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Verifying your email...</h1>
          <p className="text-gray-400">Please wait a moment.</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
