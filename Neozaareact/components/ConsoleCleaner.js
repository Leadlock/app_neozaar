'use client';

import { useEffect } from 'react';
import { cleanConsole } from '@/utils/consoleCleaner';

export default function ConsoleCleaner() {
  useEffect(() => {
    // Clean console on mount
    const cleanup = cleanConsole();
    
    // Also try to intercept and remove existing error elements
    const removeExistingErrors = () => {
      // Remove Meta Pixel error elements if they exist
      const errorElements = document.querySelectorAll('[data-testid="console-error"]');
      errorElements.forEach(el => el.remove());
    };

    // Run after a short delay to catch late-loading scripts
    const timer = setTimeout(removeExistingErrors, 1000);

    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, []);

  return null;
}