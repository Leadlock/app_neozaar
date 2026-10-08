// utils/consoleCleaner.js
export function cleanConsole() {
  if (typeof window === 'undefined') return;

  // Store original methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalGroup = console.group;
  const originalGroupCollapsed = console.groupCollapsed;

  // Patterns to suppress
  const suppressPatterns = [
    // Meta Pixel errors
    'Invalid PixelID',
    'Meta Pixel',
    'fbq is not defined',
    'Facebook Pixel',
    'fbevents.js',
    
    // CSS preload warnings
    'preloaded but not used',
    'was preloaded using link preload',
    'didn\'t load its target',
    'preload',
    
    // Next.js specific warnings
    'next-dev.js',
    'React hydration',
    'Hydration failed',
    
    // Development warnings
    'Warning:',
    'deprecated',
    'UNSAFE_',
  ];

  // Override console.error
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Check if any suppress pattern matches
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = (...args) => {
    const message = args.join(' ');
    
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  // Override console.group
  console.group = (...args) => {
    const message = args.join(' ');
    
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalGroup.apply(console, args);
    }
  };

  // Override console.groupCollapsed
  console.groupCollapsed = (...args) => {
    const message = args.join(' ');
    
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalGroupCollapsed.apply(console, args);
    }
  };

  // Return cleanup function
  return () => {
    console.error = originalError;
    console.warn = originalWarn;
    console.group = originalGroup;
    console.groupCollapsed = originalGroupCollapsed;
  };
}