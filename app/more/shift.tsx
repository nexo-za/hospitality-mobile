import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';

export default function ShiftRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/shifts' as any);
  }, []);

  return (
    <View style={tw`flex-1 items-center justify-center bg-white`}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={[tw`mt-3 text-gray-500`, typography.body]}>
        Redirecting to Shift Management...
      </Text>
    </View>
  );
}
