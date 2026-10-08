// pages/_app.js
import { useEffect } from 'react';
import { suppressNextWarnings } from '@/utils/suppressWarnings';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Suppress warnings on client side
    const cleanup = suppressNextWarnings();
    return cleanup;
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;