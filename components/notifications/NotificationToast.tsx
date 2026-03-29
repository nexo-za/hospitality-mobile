import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  NotificationPriority,
  getNavigationTarget,
} from '@/types/notifications';

const PRIORITY_STYLES: Record<
  NotificationPriority,
  { bg: string; icon: string; iconName: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  [NotificationPriority.CRITICAL]: {
    bg: '#DC2626',
    icon: '#FCA5A5',
    iconName: 'alert-circle',
  },
  [NotificationPriority.HIGH]: {
    bg: '#EA580C',
    icon: '#FDBA74',
    iconName: 'alert',
  },
  [NotificationPriority.MEDIUM]: {
    bg: '#2563EB',
    icon: '#93C5FD',
    iconName: 'information',
  },
  [NotificationPriority.LOW]: {
    bg: '#6B7280',
    icon: '#D1D5DB',
    iconName: 'bell-outline',
  },
};

export default function NotificationToast() {
  const { activeToast, dismissToast, markRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (activeToast) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-200, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [activeToast, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!activeToast) return null;

  const style = PRIORITY_STYLES[activeToast.priority];
  const isCritical =
    activeToast.priority === NotificationPriority.CRITICAL;

  const handlePress = () => {
    markRead(activeToast.id);
    dismissToast();
    const target = getNavigationTarget(activeToast);
    if (target) {
      router.push(target.screen as any);
    }
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: insets.top + 4,
          left: 12,
          right: 12,
          zIndex: 9999,
        },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable onPress={handlePress}>
        <View
          style={[
            tw`rounded-2xl px-4 py-3 flex-row items-center`,
            {
              backgroundColor: style.bg,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={style.iconName}
            size={24}
            color={style.icon}
            style={tw`mr-3`}
          />

          <View style={tw`flex-1 mr-2`}>
            <Text
              style={[
                tw`text-white`,
                typography.captionSemibold,
              ]}
              numberOfLines={1}
            >
              {activeToast.title}
            </Text>
            <Text
              style={[tw`text-white`, { opacity: 0.9, fontSize: 12 }]}
              numberOfLines={2}
            >
              {activeToast.body}
            </Text>
          </View>

          {isCritical ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                dismissToast();
              }}
              hitSlop={12}
              style={tw`ml-1`}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
