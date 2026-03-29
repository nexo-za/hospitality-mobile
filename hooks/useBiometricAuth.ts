import { useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = '@nexo_biometric_enabled';
const SESSION_TOKEN_KEY = '@nexo_session_token';

let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch {
  // expo-local-authentication not installed — biometrics will be unavailable
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  const checkAvailability = useCallback(async () => {
    if (!LocalAuthentication) {
      setIsAvailable(false);
      return false;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      setIsAvailable(available);

      if (available) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          setBiometricType('face');
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricType('fingerprint');
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.IRIS)
        ) {
          setBiometricType('iris');
        }
      }

      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkAvailability();

    SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY).then((value) => {
      setIsEnabled(value === 'true');
    });
  }, [checkAvailability]);

  const enableBiometric = useCallback(async (sessionToken: string) => {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, sessionToken);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    setIsEnabled(true);
  }, []);

  const disableBiometric = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    setIsEnabled(false);
  }, []);

  const authenticate = useCallback(async (): Promise<string | null> => {
    if (!LocalAuthentication) return null;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
        return token;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  return {
    isAvailable,
    isEnabled,
    biometricType,
    enableBiometric,
    disableBiometric,
    authenticate,
    checkAvailability,
  };
}
