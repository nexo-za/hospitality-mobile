import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text as GeistText } from '@/components/Text';
import tw from '@/styles/tailwind';
import EcentricPayment from '../../utils/EcentricPayment';
import { getEcentricConfig } from '../../config/dynamicAppConfig';

export default function EcentricAuthTestScreen() {
  const [authStatus, setAuthStatus] = useState<string>('Not started');
  const [authResult, setAuthResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testAuthentication = async () => {
    setIsLoading(true);
    setAuthStatus('Starting authentication...');
    setAuthResult(null);

    try {
      console.log('[AUTH TEST] Starting authentication test...');
      
      // Get current configuration
      const config = await getEcentricConfig();
      console.log('[AUTH TEST] Current configuration:', {
        appURL: config?.appUrl || 'NOT SET',
        appClass: config?.appClass || 'NOT SET',
        isSunmiDevice: config?.isSunmiDevice || false,
        merchantId: config?.merchantId ? '****' : 'NOT SET',
        secretKeyLength: config?.secretKey ? config.secretKey.length : 0,
        accessKeyLength: config?.accessKey ? config.accessKey.length : 0,
      });

      // Test the authentication
      const authKey = await EcentricPayment.performRetailAuth();
      
      setAuthStatus('SUCCESS');
      setAuthResult({
        success: true,
        authKey: authKey ? `${authKey.substring(0, 10)}...` : 'null',
        message: 'Authentication completed successfully'
      });
      
      console.log('[AUTH TEST] Authentication successful:', authKey ? 'Key received' : 'No key');
      
    } catch (error) {
      console.error('[AUTH TEST] Authentication failed:', error);
      
      setAuthStatus('FAILED');
      setAuthResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Authentication failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthentication = async () => {
    try {
      await EcentricPayment.clearAuthentication();
      setAuthStatus('Authentication cleared');
      setAuthResult(null);
      Alert.alert('Success', 'Authentication data cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear authentication: ' + error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const hasAuth = EcentricPayment.getAuthenticationKey();
      if (hasAuth) {
        setAuthStatus('Has stored authentication');
        setAuthResult({
          success: true,
          authKey: `${hasAuth.substring(0, 10)}...`,
          message: 'Authentication key found in storage'
        });
      } else {
        setAuthStatus('No stored authentication');
        setAuthResult(null);
      }
    } catch (error) {
      setAuthStatus('Error checking status');
      setAuthResult({ success: false, error: error });
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-gray-50 p-4`}>
      <View style={tw`mb-6`}>
        <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>
          Ecentric Authentication Test
        </Text>
        <Text style={tw`text-gray-600`}>
          Test the Ecentric payment terminal authentication flow
        </Text>
      </View>

      {/* Configuration Display */}
      <View style={tw`bg-white p-4 rounded-lg mb-4 border border-gray-200`}>
        <Text style={tw`text-lg font-semibold text-gray-800 mb-2`}>
          Current Configuration
        </Text>
        <Text style={tw`text-sm text-gray-600 mb-1`}>
          App URL: {authResult?.config?.appUrl || 'NOT SET'}
        </Text>
        <Text style={tw`text-sm text-gray-600 mb-1`}>
          App Class: {authResult?.config?.appClass || 'NOT SET'}
        </Text>
        <Text style={tw`text-sm text-gray-600 mb-1`}>
          SUNMI Device: {authResult?.config?.isSunmiDevice ? 'Yes' : 'No'}
        </Text>
        <Text style={tw`text-sm text-gray-600 mb-1`}>
          Merchant ID: {authResult?.config?.merchantId ? '****' : 'NOT SET'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={tw`space-y-3 mb-6`}>
        <TouchableOpacity
          style={tw`bg-blue-600 p-4 rounded-lg ${isLoading ? 'opacity-50' : ''}`}
          onPress={testAuthentication}
          disabled={isLoading}
        >
          <Text style={tw`text-white font-semibold text-center text-lg`}>
            {isLoading ? 'Authenticating...' : 'Test Authentication'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`bg-gray-600 p-4 rounded-lg`}
          onPress={checkAuthStatus}
        >
          <Text style={tw`text-white font-semibold text-center text-lg`}>
            Check Auth Status
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`bg-red-600 p-4 rounded-lg`}
          onPress={clearAuthentication}
        >
          <Text style={tw`text-white font-semibold text-center text-lg`}>
            Clear Authentication
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Display */}
      <View style={tw`bg-white p-4 rounded-lg mb-4 border border-gray-200`}>
        <Text style={tw`text-lg font-semibold text-gray-800 mb-2`}>
          Authentication Status
        </Text>
        <Text style={tw`text-sm text-gray-600 mb-2`}>
          Status: {authStatus}
        </Text>
        
        {authResult && (
          <View style={tw`mt-3 p-3 rounded-lg ${authResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <Text style={tw`font-medium ${authResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {authResult.message}
            </Text>
            {authResult.authKey && (
              <Text style={tw`text-sm text-gray-600 mt-1`}>
                Auth Key: {authResult.authKey}
              </Text>
            )}
            {authResult.error && (
              <Text style={tw`text-sm text-red-600 mt-1`}>
                Error: {authResult.error}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={tw`bg-blue-50 p-4 rounded-lg border border-blue-200`}>
        <Text style={tw`text-lg font-semibold text-blue-800 mb-2`}>
          Instructions
        </Text>
        <Text style={tw`text-sm text-blue-700 mb-2`}>
          1. Ensure the Ecentric Payment app is installed on your device
        </Text>
        <Text style={tw`text-sm text-blue-700 mb-2`}>
          2. Verify your merchant credentials are correct
        </Text>
        <Text style={tw`text-sm text-blue-700 mb-2`}>
          3. Check that you have a stable internet connection
        </Text>
        <Text style={tw`text-sm text-blue-700`}>
          4. The authentication process will launch the Ecentric app
        </Text>
      </View>
    </ScrollView>
  );
}
