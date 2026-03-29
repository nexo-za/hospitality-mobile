import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import LoadingScreen from '@/components/LoadingScreen';
import { theme } from '@/styles/theme';
import { StaffSessionProvider } from '@/contexts/StaffSessionContext';
import { TablesProvider } from '@/contexts/TablesContext';
import { MenuProvider } from '@/contexts/MenuContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { PaymentsProvider } from '@/contexts/PaymentsContext';
import { ApprovalsProvider } from '@/contexts/ApprovalsContext';
import { GuestsProvider } from '@/contexts/GuestsContext';
import { ReservationsProvider } from '@/contexts/ReservationsContext';
import { CashTillProvider } from '@/contexts/CashTillContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationToast from '@/components/notifications/NotificationToast';
import pushNotificationService from '@/api/services/pushNotificationService';
import { View } from 'react-native';
import ErrorBoundary from '@/components/ErrorBoundary';

import fsManager from '../utils/FSManager';
import offlineQueue from '@/api/utils/offlineQueue';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isAuthenticated) {
      pushNotificationService.initialize((data) => {
        if (data.screen) {
          router.push(data.screen as any);
        }
      });
    }
    return () => {
      if (!isAuthenticated) {
        pushNotificationService.teardown();
      }
    };
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDevGroup = segments[0] === '(dev)';

    if ((segments.length as number) === 0 || inDevGroup) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          headerTitleStyle: { fontFamily: theme.fonts.geist.medium },
          gestureEnabled: true,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(account)" options={{ headerShown: false }} />
        <Stack.Screen name="table" options={{ headerShown: false }} />
        <Stack.Screen name="order" options={{ headerShown: false }} />
        <Stack.Screen name="menu-item" options={{ headerShown: false }} />
        <Stack.Screen name="more" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <OfflineIndicator />
      <NotificationToast />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    'Geist-Thin': require('../assets/fonts/Geist-Thin.ttf'),
    'Geist-Light': require('../assets/fonts/Geist-Light.ttf'),
    'Geist-Regular': require('../assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('../assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('../assets/fonts/Geist-SemiBold.ttf'),
    'Geist-Bold': require('../assets/fonts/Geist-Bold.ttf'),
    'Geist-ExtraBold': require('../assets/fonts/Geist-ExtraBold.ttf'),
    'Geist-Black': require('../assets/fonts/Geist-Black.ttf'),
  });

  useEffect(() => {
    const initSystems = async () => {
      try {
        await fsManager.initialize();
        await offlineQueue.init();
      } catch (error) {
        console.error('Failed to initialize systems:', error);
      }
    };
    initSystems();
    return () => { offlineQueue.destroy(); };
  }, []);

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [loaded, fontError]);

  if (!loaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
            <StaffSessionProvider>
              <TablesProvider>
                <MenuProvider>
                  <OrderProvider>
                    <PaymentsProvider>
                      <ApprovalsProvider>
                        <GuestsProvider>
                          <ReservationsProvider>
                            <CashTillProvider>
                              <ShiftProvider>
                                <RootLayoutNav />
                              </ShiftProvider>
                            </CashTillProvider>
                          </ReservationsProvider>
                        </GuestsProvider>
                      </ApprovalsProvider>
                    </PaymentsProvider>
                  </OrderProvider>
                </MenuProvider>
              </TablesProvider>
            </StaffSessionProvider>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
