import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Image, StatusBar } from 'react-native';
import tw from '@/styles/tailwind';
import StaffHeader from '@/components/StaffHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text as GeistText } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffSession } from '@/contexts/StaffSessionContext';
import { NotificationBell } from '@/components/notifications/NotificationCenter';
import React from 'react';

export default function TabLayout() {
  const { user } = useAuth();
  const { currentStaff } = useStaffSession();

  const headerStore =
    currentStaff?.storeName ||
    (user as any)?.storeName ||
    '';

  return (
    <View style={tw`flex-1`}>
      <StatusBar barStyle="light-content" backgroundColor="#548AF7" />
      <SafeAreaView style={{ backgroundColor: '#548AF7' }}>
        <View style={tw`flex-row items-center px-4 pt-1.5`}>
          <Image
            source={require('@/assets/images/nexoslo.png')}
            style={{ width: 72, height: 28, tintColor: '#ffffff' }}
            resizeMode="contain"
          />

          <View style={tw`flex-1`} />

          {headerStore ? (
            <View
              pointerEvents="none"
              style={tw`absolute left-0 right-0 items-center`}
            >
              <GeistText
                style={[{ color: 'rgba(255,255,255,0.85)' }, typography.captionSemibold]}
                numberOfLines={1}
              >
                {headerStore}
              </GeistText>
            </View>
          ) : null}

          <View style={tw`flex-row items-center gap-1`}>
            <NotificationBell color="#ffffff" />
            <StaffHeader showStoreInfo={false} compact={true} variant="onDark" />
          </View>
        </View>
      </SafeAreaView>

      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="tables"
          options={{
            title: 'Tables',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="table-furniture"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="food-fork-drink"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="view-dashboard"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen name="shifts" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
