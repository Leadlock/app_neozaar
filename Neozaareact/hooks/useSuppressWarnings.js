// hooks/useSuppressWarnings.js
'use client';

import { useEffect } from 'react';

/**
 * Custom hook to suppress specific console warnings in development
 * Use this in any client component that shows annoying warnings
 */
export function useSuppressWarnings(options = {}) {
  const {
    suppressPixelErrors = true,
    suppressCSSPreload = true,
    suppressReactWarnings = false,
  } = options;

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // Override console.error
    console.error = (...args) => {
      const errorMessage = args[0]?.toString?.() || '';
      
      // Suppress Meta Pixel errors
      if (suppressPixelErrors) {
        if (
          errorMessage.includes('Invalid PixelID') ||
          errorMessage.includes('Meta Pixel') ||
          errorMessage.includes('fbq is not defined') ||
          (errorMessage.includes('fbq') && errorMessage.includes('init'))
        ) {
          return; // Suppress these errors
        }
      }

      // Suppress React warnings (optional)
      if (suppressReactWarnings) {
        if (
          errorMessage.includes('Warning:') &&
          (errorMessage.includes('ReactDOM.render') ||
           errorMessage.includes('componentWill') ||
           errorMessage.includes('UNSAFE_'))
        ) {
          return;
        }
      }

      // Pass through all other errors
      originalError.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args) => {
      const warningMessage = args[0]?.toString?.() || '';
      
      // Suppress CSS preload warnings
      if (suppressCSSPreload) {
        if (
          warningMessage.includes('preloaded but not used') ||
          warningMessage.includes('was preloaded using link preload') ||
          warningMessage.includes('didn\'t load its target') ||
          warningMessage.includes('preload') && warningMessage.includes('css')
        ) {
          return; // Suppress these warnings
        }
      }

      // Suppress Next.js specific warnings
      if (
        warningMessage.includes('next') &&
        warningMessage.includes('warning')
      ) {
        return;
      }

      // Pass through all other warnings
      originalWarn.apply(console, args);
    };

    // Cleanup function to restore original console methods
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, [suppressPixelErrors, suppressCSSPreload, suppressReactWarnings]);
}

/**
 * Specialized hook for Meta Pixel errors only
 */
export function useSuppressPixelErrors() {
  return useSuppressWarnings({
    suppressPixelErrors: true,
    suppressCSSPreload: false,
    suppressReactWarnings: false,
  });
}

/**
 * Specialized hook for CSS preload warnings only
 */
export function useSuppressCSSWarnings() {
  return useSuppressWarnings({
    suppressPixelErrors: false,
    suppressCSSPreload: true,
    suppressReactWarnings: false,
  });
}

/**
 * Specialized hook for all warnings
 */
export function useSuppressAllWarnings() {
  return useSuppressWarnings({
    suppressPixelErrors: true,
    suppressCSSPreload: true,
    suppressReactWarnings: true,
  });
}