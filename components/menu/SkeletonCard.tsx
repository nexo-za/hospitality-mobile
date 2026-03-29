import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import tw from '@/styles/tailwind';

function Shimmer({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[{ opacity, backgroundColor: '#E5E7EB', borderRadius: 8 }, style]} />;
}

export function SkeletonMenuCard() {
  return (
    <View style={tw`bg-white rounded-xl p-4 mb-3 mx-4 border border-gray-100 flex-row items-center`}>
      <Shimmer style={tw`w-14 h-14 rounded-xl mr-3`} />
      <View style={tw`flex-1`}>
        <Shimmer style={tw`h-4 w-3/4 rounded mb-2`} />
        <Shimmer style={tw`h-3 w-1/2 rounded mb-2`} />
        <Shimmer style={tw`h-4 w-1/4 rounded`} />
      </View>
    </View>
  );
}

export function SkeletonCategoryPills() {
  return (
    <View style={tw`flex-row px-4 py-2`}>
      {[80, 60, 70, 55, 65].map((w, i) => (
        <Shimmer key={i} style={[tw`h-9 rounded-full mr-2`, { width: w }]} />
      ))}
    </View>
  );
}
