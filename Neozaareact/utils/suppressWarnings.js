// utils/suppressWarnings.js

/**
 * Suppresses specific console warnings in development
 * Call this in your root layout
 */
export function suppressNextWarnings() {
  if (process.env.NODE_ENV === 'development') {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    // Override console.error
    console.error = (...args) => {
      // Filter out Meta Pixel errors
      if (
        args[0]?.includes?.('Invalid PixelID') ||
        args[0]?.includes?.('Meta Pixel') ||
        (args[0]?.includes?.('fbq') && args[0]?.includes?.('init'))
      ) {
        return; // Suppress these errors
      }
      
      // Filter out common React warnings (optional)
      if (
        args[0]?.includes?.('Warning:') &&
        (args[0]?.includes?.('ReactDOM.render') ||
         args[0]?.includes?.('componentWill'))
      ) {
        return;
      }
      
      originalError.apply(console, args);
    };
    
    // Override console.warn
    console.warn = (...args) => {
      // Filter out CSS preload warnings
      if (
        args[0]?.includes?.('preloaded but not used') ||
        args[0]?.includes?.('was preloaded using link preload') ||
        args[0]?.includes?.('didn\'t load its target')
      ) {
        return; // Suppress these warnings
      }
      
      // Filter out Next.js specific warnings
      if (
        args[0]?.includes?.('next') &&
        args[0]?.includes?.('warning')
      ) {
        return;
      }
      
      originalWarn.apply(console, args);
    };
    
    // Return cleanup function
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }
  
  // Return no-op for production
  return () => {};
}

/**
 * Suppress specific warnings by pattern
 */
export function suppressWarnings(patterns) {
  if (process.env.NODE_ENV === 'development') {
    const originalWarn = console.warn;
    
    console.warn = (...args) => {
      const shouldSuppress = patterns.some(pattern => {
        if (typeof pattern === 'string') {
          return args[0]?.includes?.(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(args[0]);
        }
        return false;
      });
      
      if (!shouldSuppress) {
        originalWarn.apply(console, args);
      }
    };
    
    return () => {
      console.warn = originalWarn;
    };
  }
  
  return () => {};
}

/**
 * Suppress Meta Pixel errors specifically
 */
export function suppressMetaPixelErrors() {
  return suppressWarnings([
    'Invalid PixelID',
    'Meta Pixel',
    'fbq is not defined',
    'fbq',
  ]);
}

/**
 * Suppress CSS preload warnings specifically
 */
export function suppressCSSPreloadWarnings() {
  return suppressWarnings([
    'preloaded but not used',
    'was preloaded using link preload',
    /preload.*css/i,
  ]);
}