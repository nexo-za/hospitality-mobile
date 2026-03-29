import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text as GeistText } from '@/components/Text';
import tw from '@/styles/tailwind';
import EcentricPayment from '../../utils/EcentricPayment';

interface EcentricAuthFlowProps {
  onAuthSuccess: (authKey: string) => void;
  onAuthFailure: (error: string) => void;
  autoStart?: boolean;
}

export default function EcentricAuthFlow({ 
  onAuthSuccess, 
  onAuthFailure, 
  autoStart = false 
}: EcentricAuthFlowProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'success' | 'failed'>('idle');

  useEffect(() => {
    if (autoStart) {
      startAuthentication();
    }
  }, [autoStart]);

  const startAuthentication = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setAuthStatus('authenticating');

    try {
      console.log('[EcentricAuthFlow] Starting Retail Auth process...');
      
      // Use the new performRetailAuth method
      const authKey = await EcentricPayment.performRetailAuth();
      
      console.log('[EcentricAuthFlow] Retail Auth successful, received key');
      setAuthStatus('success');
      onAuthSuccess(authKey);
      
    } catch (error) {
      console.error('[EcentricAuthFlow] Retail Auth failed:', error);
      setAuthStatus('failed');
      onAuthFailure(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const retryAuthentication = () => {
    setAuthStatus('idle');
    startAuthentication();
  };

  if (authStatus === 'success') {
    return (
      <View style={tw`p-4 bg-green-50 border border-green-200 rounded-lg`}>
        <Text style={tw`text-green-800 font-medium`}>
          ✓ Authentication successful
        </Text>
        <Text style={tw`text-green-600 text-sm mt-1`}>
          You can now process payments
        </Text>
      </View>
    );
  }

  if (authStatus === 'failed') {
    return (
      <View style={tw`p-4 bg-red-50 border border-red-200 rounded-lg`}>
        <Text style={tw`text-red-800 font-medium`}>
          ✗ Authentication failed
        </Text>
        <Text style={tw`text-red-600 text-sm mt-1 mb-3`}>
          Please check your credentials and try again
        </Text>
        <TouchableOpacity
          style={tw`bg-red-600 px-4 py-2 rounded-lg`}
          onPress={retryAuthentication}
        >
          <Text style={tw`text-white font-medium text-center`}>
            Retry Authentication
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`p-4 bg-blue-50 border border-blue-200 rounded-lg`}>
      <Text style={tw`text-blue-800 font-medium mb-2`}>
        Ecentric Payment Authentication Required
      </Text>
      <Text style={tw`text-blue-600 text-sm mb-3`}>
        Before processing payments, you need to authenticate with the payment terminal.
      </Text>
      
      <TouchableOpacity
        style={tw`bg-blue-600 px-4 py-2 rounded-lg ${isAuthenticating ? 'opacity-50' : ''}`}
        onPress={startAuthentication}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <View style={tw`flex-row items-center justify-center`}>
            <ActivityIndicator size="small" color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium`}>
              Authenticating...
            </Text>
          </View>
        ) : (
          <Text style={tw`text-white font-medium text-center`}>
            Start Authentication
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
