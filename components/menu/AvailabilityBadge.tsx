import React from 'react';
import { View } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';

interface AvailabilityBadgeProps {
  isAvailable: boolean;
  size?: 'sm' | 'md';
}

export function AvailabilityBadge({ isAvailable, size = 'sm' }: AvailabilityBadgeProps) {
  if (isAvailable) {
    return (
      <View style={tw`flex-row items-center`}>
        <View style={tw`w-2 h-2 rounded-full bg-green-500 mr-1`} />
        {size === 'md' && (
          <Text style={[tw`text-xs text-green-600`, typography.caption]}>Available</Text>
        )}
      </View>
    );
  }

  return (
    <View style={tw`bg-red-500 rounded-full px-2 py-0.5`}>
      <Text style={[tw`text-xs text-white`, typography.captionSemibold]}>
        86'd
      </Text>
    </View>
  );
}
