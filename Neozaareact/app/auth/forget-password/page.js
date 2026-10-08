'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: password reset
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);


  const handleForgetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}forget-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        toast.error(`Unexpected server response: ${text}`);
        return;
      }

      if (res.ok && data.status === 'success') {
      //    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}send-otp`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ email }),
      // });
        toast.success('OTP sent to your email');
        setStep(2); // Move to OTP verification step
      } else {
        toast.error(data.message || 'Request failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        toast.error(`Unexpected server response: ${text}`);
        return;
      }

      if (res.ok && data.status === 'success') {
        toast.success('OTP verified successfully');
         const {token} = data.data;
         localStorage.setItem('verify-token',token);
        
        setToken(data.token || data.data.token);

        setStep(3); // Move to password reset step
      } else {
        toast.error(data.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

const handleResetPassword = async (e) => {
  e.preventDefault();
  const checktoken = localStorage.getItem('verify-token');
  
  if (!checktoken) {
    toast.error('Token not found. Please verify your OTP again.');
    return;
  }
  
  if (password !== confirm_password) {
    toast.error('Passwords do not match');
    return;
  }

  if (password.length < 6) {
    toast.error('Password must be at least 6 characters long');
    return;
  }
  
  setLoading(true);

  try {
    // Option 1: Send token as query parameter (as in your original code)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}reset-password?token=${checktoken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm_password, password }),
    });

 

    const contentType = res.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      toast.error(`Unexpected server response: ${text}`);
      return;
    }

    if (res.ok && data.status === 'success') {
      toast.success('Password reset successfully');
      // Clear the token from localStorage after successful reset
      localStorage.removeItem('verify-token');
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } else {
      toast.error(data.message || 'Password reset failed');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-[1920px] m-auto">
      {/* <Toaster position="top-center" reverseOrder={false} /> */}

      <section className="grid grid-cols-1 md:grid-cols-2 w-full min-h-screen">
        <div className="bg-black flex flex-col items-center justify-center px-6 py-10">
          <div className="relative h-12 w-50 mb-6">
            <Image src="/image/logo-s.png" alt="Logo" width={192} height={48} className="object-contain" />
          </div>

          <p className="mb-8 text-center text-gray-300 text-sm md:text-base">
            {step === 1 
              ? 'Enter your email to reset your password' 
              : step === 2
                ? 'Enter the OTP sent to your email'
                : 'Reset your password'}
          </p>

          <form 
            onSubmit={
              step === 1 ? handleForgetPassword : 
              step === 2 ? handleVerifyOtp : 
              handleResetPassword
            } 
            className="w-full max-w-sm space-y-5"
          >
            {step === 1 && (
              <div className="bg-zinc-900 border border-zinc-800 py-4 flex items-center justify-start h-[52px]">
                <Image width={6} height={6} src="/image/RiMailFill.png" alt="Email Icon" className="w-6 h-6 mx-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="bg-zinc-900 px-4 py-3 h-[52px] text-sm text-zinc-300 w-full outline-none"
                  required
                />
              </div>
            )}

            {step === 2 && (
              <div className="bg-zinc-900 border border-zinc-800 py-4 flex items-center justify-start h-[52px]">
       <i className="ri-git-repository-private-fill text-gray-500 px-3"></i>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter OTP"
                  className="bg-zinc-900 px-4 py-3 h-[52px] text-sm text-zinc-300 w-full outline-none"
                  required
                  maxLength={6}
                />
              </div>
            )}

            {step === 3 && (
              <>
                <div className="bg-zinc-900 border border-zinc-800 py-4 flex items-center justify-start h-[52px]">
                  <i className="ri-key-line text-gray-500 px-3"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password"
                    className="bg-zinc-900 px-4 py-3 h-[52px] text-sm text-zinc-300 w-full outline-none"
                    required
                    minLength={6}
                  />
                  <button 
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}>
                    <Image src="/image/RiEyeFill.png" alt="Show Icon" width={24} height={24} className=" mx-4 cursor-pointer" />
                  </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 py-4 flex items-center justify-start h-[52px]">
              <i className="ri-key-line text-gray-500 px-3"></i>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm_password}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="bg-zinc-900 px-4 py-3 h-[52px] text-sm text-zinc-300 w-full outline-none"
                    required
                    minLength={6}
                  />
                  <button type='button'
                  onClick={() => setShowConfirm(!showConfirm)}>
                    <Image src="/image/RiEyeFill.png" alt="Show Icon" width={24} height={24} className=" mx-4 cursor-pointer" />
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-700 text-white font-medium"
            >
              {loading 
                ? 'Please wait...' 
                : step === 1 
                  ? 'Send OTP' 
                  : step === 2
                    ? 'Verify OTP'
                    : 'Reset Password'}
            </button>

       
          </form>

          <div className="mt-10 text-sm text-gray-500">
            Need Help?{' '}
            <a href="#" className="text-white font-bold underline">
              Contact
            </a>
          </div>
        </div>

        <div className="w-full h-[400px] md:h-auto">
          <div className="h-full w-full bg-cover bg-center relative bg-[url('/assests/loginbg.png')]">
            <div className="flex items-center justify-center h-full px-6 py-10 md:py-0">
              <p className="text-white font-light text-[26px] md:text-[35px] leading-snug text-center md:text-left font-['CreatoDisplay-Light',_sans-serif] max-w-[90%] md:max-w-[366px]">
                Access your<br />
                personalized <br />
                cloud solutions<br />
                and manage<br />
                your bundled<br />
                services.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}