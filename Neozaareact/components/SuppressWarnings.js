'use client';

import { useEffect } from 'react';

export default function SuppressWarnings() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console.error
    console.error = (...args) => {
      const errorMessage = args[0]?.toString?.() || '';
      
      // Suppress Meta Pixel errors
      if (
        errorMessage.includes('Invalid PixelID') ||
        errorMessage.includes('Meta Pixel') ||
        (errorMessage.includes('fbq') && errorMessage.includes('init'))
      ) {
        return;
      }
      
      // Suppress hydration warnings
      if (errorMessage.includes('Hydration') || errorMessage.includes('hydrate')) {
        return;
      }
      
      originalError.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args) => {
      const warningMessage = args[0]?.toString?.() || '';
      
      // Suppress CSS preload warnings
      if (
        warningMessage.includes('preloaded but not used') ||
        warningMessage.includes('was preloaded using link preload')
      ) {
        return;
      }
      
      // Suppress Next.js specific warnings
      if (warningMessage.includes('next') && warningMessage.includes('warning')) {
        return;
      }
      
      originalWarn.apply(console, args);
    };

    // Cleanup
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null; // This component doesn't render anything
}