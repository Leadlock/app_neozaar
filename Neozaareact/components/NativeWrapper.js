'use client';

import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import Image from 'next/image';

export default function NativeWrapper({ children }) {
  const { isConnected, isNative } = useNativeFeatures();

  if (!isConnected && isNative) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 text-center">
        <Image src="/image/Logo.png" alt="NeoZaar" width={128} height={128} priority />
        <h1 className="text-2xl font-bold text-white mt-8 mb-4">No Connection</h1>
        <button
          onClick={() => window.location.reload()}
          className="bg-orange-600 px-8 py-3 rounded-full text-white font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
