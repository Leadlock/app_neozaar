import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export const useNativeFeatures = () => {
  const [isNative, setIsNative] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Uses the native app User-Agent for instant recognition, with Capacitor as a fallback.
    const checkNative = () => {
      const ua = navigator.userAgent;
      const isApp =
        ua.indexOf('NeoZaarMobileApp') > -1 ||
        (typeof window !== 'undefined' &&
          window.Capacitor &&
          window.Capacitor.isNativePlatform());

      setIsNative(!!isApp);
      return !!isApp;
    };

    const init = async () => {
      if (!checkNative()) return;

      // Initialize Capacitor plugins only when the native bridge is available.
      if (window.Capacitor) {
        try {
          const status = await Network.getStatus();
          setIsConnected(status.connected);
          Network.addListener('networkStatusChange', (s) =>
            setIsConnected(s.connected),
          );
          setTimeout(() => SplashScreen.hide(), 500);
        } catch (e) {
          console.warn('Capacitor plugins not ready yet');
        }
      }
    };

    init();
  }, []);

  const triggerHaptic = async () => {
    if (isNative && window.Capacitor) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const openExternalLink = async (url) => {
    if (isNative && window.Capacitor) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const performBiometricAuth = async () => {
    if (!isNative || !window.Capacitor) return false;

    try {
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) return false;
      await NativeBiometric.verifyIdentity({
        reason: 'Log in to NeoZaar',
        title: 'Biometric Login',
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    isNative,
    isConnected,
    triggerHaptic,
    openExternalLink,
    performBiometricAuth,
  };
};
