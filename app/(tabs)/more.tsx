import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MenuRow {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  route: string;
  color: string;
}

const MENU_SECTIONS: { title: string; items: MenuRow[] }[] = [
  {
    title: 'Operations',
    items: [
      {
        icon: 'clock-outline',
        label: 'Shift Management',
        route: '/more/shift',
        color: '#3B82F6',
      },
      {
        icon: 'cash-register',
        label: 'Cash Till',
        route: '/more/cash-till',
        color: '#10B981',
      },
      {
        icon: 'check-decagram',
        label: 'Approvals',
        route: '/more/approvals',
        color: '#F59E0B',
      },
      {
        icon: 'monitor-dashboard',
        label: 'KDS Viewer',
        route: '/more/kds',
        color: '#8B5CF6',
      },
    ],
  },
  {
    title: 'Guests & Reservations',
    items: [
      {
        icon: 'account-group',
        label: 'Guests',
        route: '/more/guests',
        color: '#EC4899',
      },
      {
        icon: 'calendar-clock',
        label: 'Reservations',
        route: '/more/reservations',
        color: '#6366F1',
      },
      {
        icon: 'clipboard-list',
        label: 'Waitlist',
        route: '/more/waitlist',
        color: '#14B8A6',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        icon: 'account-circle',
        label: 'Profile',
        route: '/(tabs)/profile',
        color: '#6B7280',
      },
      {
        icon: 'cog',
        label: 'Settings',
        route: '/(account)/settings',
        color: '#6B7280',
      },
      {
        icon: 'information',
        label: 'About',
        route: '/(account)/about',
        color: '#6B7280',
      },
    ],
  },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`pb-12`}
    >
      <View style={tw`bg-white px-4 py-5 mb-4`}>
        <Text style={[tw`text-lg`, typography.headingSemibold]}>
          {(user as any)?.firstName} {(user as any)?.lastName}
        </Text>
        <Text style={[tw`text-sm text-gray-500 mt-1`, typography.body]}>
          {(user as any)?.role} | {(user as any)?.storeName}
        </Text>
      </View>

      {MENU_SECTIONS.map((section) => (
        <View key={section.title} style={tw`mb-4`}>
          <Text
            style={[tw`text-xs text-gray-400 uppercase px-4 mb-2`, typography.captionSemibold]}
          >
            {section.title}
          </Text>
          <View style={tw`bg-white`}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.route}
                style={tw`flex-row items-center px-4 py-3.5 ${
                  idx < section.items.length - 1
                    ? 'border-b border-gray-100'
                    : ''
                }`}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    tw`w-8 h-8 rounded-lg items-center justify-center mr-3`,
                    { backgroundColor: item.color + '15' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color={item.color}
                  />
                </View>
                <Text style={[tw`flex-1 text-base`, typography.body]}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#D1D5DB"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={tw`bg-white mx-4 rounded-xl py-3 items-center border border-red-200 mt-4`}
        onPress={logout}
      >
        <Text style={[tw`text-red-600 text-base`, typography.bodySemibold]}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
