import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';

/**
 * Legacy table detail screen -- replaced by contextual bottom sheets on the
 * floor plan (NewOrderSheet, TableHubSheet, TurnoverSheet). This route is
 * kept as a redirect so that stale deep-links or back-stack entries don't
 * crash.
 */
export default function TableDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/tables' as any);
  }, [router]);

  return (
    <View style={tw`flex-1 items-center justify-center bg-white`}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
