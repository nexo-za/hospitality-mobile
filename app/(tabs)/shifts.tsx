import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { CurrencyFormat } from '@/components/base/CurrencyFormat';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftAPI } from '@/api/services';
import shiftService from '@/api/services/shiftService';
import reportsService from '@/api/services/reportsService';
import type { ActiveShiftSummary } from '@/types/hospitality';
import type { WaiterPerformance } from '@/types/hospitality';

interface ActiveShift {
  shift_id: number;
  store_name: string | null;
  staff_name: string | null;
  start_time: string | null;
  starting_cash: number | null;
  comments: string | null;
}

interface ShiftStats {
  totalRevenue: number;
  totalChecks: number;
  tipsEarned: number;
  coversServed: number;
}

const formatDuration = (startMs: number): string => {
  const elapsed = Math.max(0, Date.now() - startMs);
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ShiftsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [duration, setDuration] = useState('');
  const [stats, setStats] = useState<ShiftStats>({
    totalRevenue: 0,
    totalChecks: 0,
    tipsEarned: 0,
    coversServed: 0,
  });
  const [canStart, setCanStart] = useState<boolean | null>(null);
  const [canStartReason, setCanStartReason] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const resp = await ShiftAPI.getActiveShift({ user_id: Number(user.id) });
      const isActive = Boolean(resp?.has_active_shift && resp.active_shift);

      if (isActive && resp.active_shift) {
        const shift = resp.active_shift as ActiveShift;
        setActiveShift(shift);

        const parsed = shift.start_time ? Number(shift.start_time) : NaN;
        if (!isNaN(parsed)) {
          setStartMs(parsed);
          setDuration(formatDuration(parsed));
        }

        const merged: ShiftStats = { totalRevenue: 0, totalChecks: 0, tipsEarned: 0, coversServed: 0 };

        try {
          const summary: ActiveShiftSummary = await shiftService.getActiveShiftSummary();
          merged.totalRevenue = summary.totalRevenue ?? 0;
          merged.totalChecks = summary.checkRevenue ? 1 : 0;
        } catch { /* non-fatal */ }

        try {
          const perf: WaiterPerformance = await reportsService.getWaiterCurrentShift(user.storeId);
          merged.totalChecks = perf.totalChecks ?? merged.totalChecks;
          merged.tipsEarned = perf.totalTips ?? 0;
          merged.coversServed = perf.totalCovers ?? 0;
          if (perf.totalRevenue) merged.totalRevenue = perf.totalRevenue;
        } catch { /* non-fatal */ }

        setStats(merged);
        setCanStart(false);
        setCanStartReason(null);
      } else {
        setActiveShift(null);
        setStartMs(null);

        try {
          const eligibility = await ShiftAPI.canStartShift({ user_id: Number(user.id) });
          setCanStart(Boolean(eligibility?.can_start));
          const reason: any = (eligibility as any)?.reason ?? (eligibility as any)?.data?.reason ?? null;
          setCanStartReason(eligibility?.can_start ? null : reason);
        } catch {
          setCanStart(false);
          setCanStartReason('Unable to check shift eligibility');
        }
      }
    } catch {
      setActiveShift(null);
      setCanStart(false);
      setCanStartReason('Failed to load shift status');
    }
  }, [user?.id, user?.storeId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await fetchData();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchData]);

  useEffect(() => {
    if (!activeShift || !startMs) return;
    const id = setInterval(() => setDuration(formatDuration(startMs)), 60_000);
    return () => clearInterval(id);
  }, [activeShift, startMs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleStartShift = () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    if (canStart === false) {
      Alert.alert('Cannot Start Shift', canStartReason || 'You cannot start a shift right now.');
      return;
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      store_id: user.storeId,
      store_name: user.storeName || '',
      staff_id: user.employeeId || user.id,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      contact_number: user.contactNumber || '',
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
    };

    router.push({
      pathname: '/screens/StartShiftScreen',
      params: {
        userId: String(user.id),
        storeId: String(user.storeId),
        userData: JSON.stringify(userData),
      },
    });
  };

  if (authLoading || loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[tw`mt-3 text-gray-500`, typography.body]}>Loading shift data...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <MaterialCommunityIcons name="account-alert" size={48} color="#f59e0b" style={tw`mb-4`} />
        <Text style={[tw`text-gray-900 mb-2`, typography.h3]}>Login Required</Text>
        <Text style={[tw`text-gray-500 text-center mb-4 px-8`, typography.body]}>
          Please log in to manage your shifts
        </Text>
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-xl py-3 px-6 flex-row items-center`}
          onPress={() => router.push('/login')}
        >
          <MaterialCommunityIcons name="login" size={20} color="white" style={tw`mr-2`} />
          <Text style={[tw`text-white`, typography.bodySemibold]}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeShift) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <ScrollView
          contentContainerStyle={tw`flex-1 justify-center items-center px-6`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={tw`bg-white rounded-2xl p-8 items-center w-full border border-gray-100`}>
            <View style={tw`bg-blue-50 rounded-full p-5 mb-5`}>
              <MaterialCommunityIcons name="clock-outline" size={48} color="#3B82F6" />
            </View>
            <Text style={[tw`text-gray-900 mb-2`, typography.h3]}>No Active Shift</Text>
            <Text style={[tw`text-gray-500 text-center mb-6`, typography.body]}>
              Start a shift to begin serving customers and tracking sales.
            </Text>
            <TouchableOpacity
              style={tw`${canStart === false ? 'bg-gray-300' : 'bg-blue-500'} rounded-xl py-4 px-10 w-full items-center`}
              onPress={handleStartShift}
              disabled={canStart === false}
            >
              <Text style={[tw`text-white text-base`, typography.bodySemibold]}>Start Shift</Text>
            </TouchableOpacity>
            {canStart === false && canStartReason && (
              <Text style={[tw`text-red-500 text-center mt-3`, typography.caption]}>{canStartReason}</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        contentContainerStyle={tw`pb-8`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Shift Header */}
        <View style={tw`bg-white mx-4 mt-4 rounded-2xl p-4 border border-gray-100`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`bg-green-100 rounded-full p-2 mr-3`}>
                <MaterialCommunityIcons name="clock-check" size={20} color="#16a34a" />
              </View>
              <View>
                <Text style={[tw`text-gray-900`, typography.h3]}>Active Shift #{activeShift.shift_id}</Text>
                <Text style={[tw`text-gray-500`, typography.caption]}>
                  {startMs ? `Started ${formatTime(startMs)}` : 'In progress'}
                  {duration ? ` · ${duration}` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={tw`flex-row flex-wrap mt-2`}>
            {activeShift.staff_name && (
              <View style={tw`bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center`}>
                <MaterialCommunityIcons name="account" size={14} color="#6b7280" />
                <Text style={[tw`ml-1 text-gray-700`, typography.caption]}>{activeShift.staff_name}</Text>
              </View>
            )}
            {activeShift.store_name && (
              <View style={tw`bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center`}>
                <MaterialCommunityIcons name="store" size={14} color="#6b7280" />
                <Text style={[tw`ml-1 text-gray-700`, typography.caption]}>{activeShift.store_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* My Shift Stats */}
        <View style={tw`mx-4 mt-4`}>
          <Text style={[tw`text-gray-900 mb-3`, typography.h3]}>My Shift Stats</Text>
          <View style={tw`flex-row mb-3`}>
            <View style={tw`flex-1 bg-white rounded-xl p-4 mr-2 border border-gray-100`}>
              <View style={tw`flex-row items-center mb-1`}>
                <MaterialCommunityIcons name="chart-line" size={16} color="#2563eb" style={tw`mr-1`} />
                <Text style={[tw`text-gray-500 text-xs`, typography.caption]}>Total Revenue</Text>
              </View>
              <Text style={[tw`text-gray-900`, typography.h3]}>
                <CurrencyFormat value={stats.totalRevenue} />
              </Text>
            </View>
            <View style={tw`flex-1 bg-white rounded-xl p-4 ml-2 border border-gray-100`}>
              <View style={tw`flex-row items-center mb-1`}>
                <MaterialCommunityIcons name="receipt" size={16} color="#6b7280" style={tw`mr-1`} />
                <Text style={[tw`text-gray-500 text-xs`, typography.caption]}>Total Checks</Text>
              </View>
              <Text style={[tw`text-gray-900`, typography.h3]}>{stats.totalChecks}</Text>
            </View>
          </View>
          <View style={tw`flex-row`}>
            <View style={tw`flex-1 bg-white rounded-xl p-4 mr-2 border border-gray-100`}>
              <View style={tw`flex-row items-center mb-1`}>
                <MaterialCommunityIcons name="hand-coin" size={16} color="#059669" style={tw`mr-1`} />
                <Text style={[tw`text-gray-500 text-xs`, typography.caption]}>Tips Earned</Text>
              </View>
              <Text style={[tw`text-gray-900`, typography.h3]}>
                <CurrencyFormat value={stats.tipsEarned} />
              </Text>
            </View>
            <View style={tw`flex-1 bg-white rounded-xl p-4 ml-2 border border-gray-100`}>
              <View style={tw`flex-row items-center mb-1`}>
                <MaterialCommunityIcons name="account-group" size={16} color="#8b5cf6" style={tw`mr-1`} />
                <Text style={[tw`text-gray-500 text-xs`, typography.caption]}>Covers Served</Text>
              </View>
              <Text style={[tw`text-gray-900`, typography.h3]}>{stats.coversServed}</Text>
            </View>
          </View>
        </View>

        {/* Cash Management */}
        <View style={tw`mx-4 mt-6`}>
          <Text style={[tw`text-gray-900 mb-3`, typography.h3]}>Cash Management</Text>
          <View style={tw`flex-row`}>
            {[
              { label: 'Pay In', icon: 'cash-plus' as const, color: '#059669' },
              { label: 'Pay Out', icon: 'cash-minus' as const, color: '#dc2626' },
              { label: 'Cash Drop', icon: 'safe' as const, color: '#d97706' },
              { label: 'View Cash', icon: 'cash-register' as const, color: '#2563eb' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={tw`flex-1 bg-white rounded-xl py-3 items-center border border-gray-100 mx-1`}
                onPress={() => router.push('/more/cash-till' as any)}
              >
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                <Text style={[tw`text-gray-700 text-xs mt-1`, typography.caption]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={tw`mx-4 mt-6`}>
          <Text style={[tw`text-gray-900 mb-3`, typography.h3]}>Quick Actions</Text>
          <View style={tw`flex-row flex-wrap`}>
            <TouchableOpacity
              style={tw`bg-white rounded-xl p-4 border border-gray-100 flex-1 mr-2 min-w-28`}
              onPress={() => router.push('/(tabs)/tables' as any)}
            >
              <MaterialCommunityIcons name="floor-plan" size={22} color="#3b82f6" style={tw`mb-1`} />
              <Text style={[tw`text-gray-900`, typography.bodySemibold]}>Floor Plan</Text>
              <Text style={[tw`text-gray-500`, typography.caption]}>Manage tables</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`bg-white rounded-xl p-4 border border-gray-100 flex-1 mx-1 min-w-28`}
              onPress={() => router.push('/(tabs)/orders' as any)}
            >
              <MaterialCommunityIcons name="clipboard-list" size={22} color="#10b981" style={tw`mb-1`} />
              <Text style={[tw`text-gray-900`, typography.bodySemibold]}>Orders</Text>
              <Text style={[tw`text-gray-500`, typography.caption]}>View orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`bg-white rounded-xl p-4 border border-gray-100 flex-1 ml-2 min-w-28`}
              onPress={() => router.push('/more/kds' as any)}
            >
              <MaterialCommunityIcons name="monitor-dashboard" size={22} color="#8b5cf6" style={tw`mb-1`} />
              <Text style={[tw`text-gray-900`, typography.bodySemibold]}>KDS</Text>
              <Text style={[tw`text-gray-500`, typography.caption]}>Kitchen display</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* End Shift */}
        <View style={tw`mx-4 mt-8`}>
          <TouchableOpacity
            style={tw`bg-red-500 rounded-xl py-4 items-center`}
            onPress={() => router.push('/screens/EndShiftScreen' as any)}
          >
            <View style={tw`flex-row items-center`}>
              <MaterialCommunityIcons name="clock-end" size={20} color="white" style={tw`mr-2`} />
              <Text style={[tw`text-white text-base`, typography.bodySemibold]}>End Shift</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
