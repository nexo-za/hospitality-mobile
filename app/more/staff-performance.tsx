import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import reportsService from '@/api/services/reportsService';
import type { StaffPerformanceEntry, ServerPerformance } from '@/types/hospitality';

type Tab = 'shift' | 'all';

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return 'R0.00';
  return `R${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getMedalColor(rank: number): string {
  if (rank === 1) return '#F59E0B';
  if (rank === 2) return '#9CA3AF';
  if (rank === 3) return '#CD7F32';
  return '#E5E7EB';
}

interface StaffCardProps {
  rank: number;
  name: string;
  revenue: number;
  checks: number;
  avgCheck?: number;
  tips?: number;
  covers?: number;
}

function StaffCard({ rank, name, revenue, checks, avgCheck, tips, covers }: StaffCardProps) {
  const color = getMedalColor(rank);
  return (
    <View style={tw`bg-white rounded-xl p-4 mx-4 mb-3`}>
      <View style={tw`flex-row items-center mb-3`}>
        <View
          style={[
            tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
            { backgroundColor: color + '20' },
          ]}
        >
          {rank <= 3 ? (
            <MaterialCommunityIcons name="medal" size={22} color={color} />
          ) : (
            <Text style={[tw`text-sm`, typography.bodySemibold, { color }]}>
              #{rank}
            </Text>
          )}
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-base`, typography.bodySemibold]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[tw`text-xs text-gray-400`, typography.small]}>
            {checks} check{checks !== 1 ? 's' : ''}
            {covers != null ? ` · ${covers} cover${covers !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <Text style={[tw`text-base`, typography.headingSemibold, { color: '#10B981' }]}>
          {formatCurrency(revenue)}
        </Text>
      </View>
      <View style={tw`flex-row`}>
        {avgCheck != null && (
          <View style={tw`flex-1 flex-row items-center`}>
            <MaterialCommunityIcons name="receipt" size={14} color="#6B7280" style={tw`mr-1`} />
            <Text style={[tw`text-xs text-gray-500`, typography.small]}>
              Avg: {formatCurrency(avgCheck)}
            </Text>
          </View>
        )}
        {tips != null && tips > 0 && (
          <View style={tw`flex-row items-center`}>
            <MaterialCommunityIcons name="hand-coin" size={14} color="#F59E0B" style={tw`mr-1`} />
            <Text style={[tw`text-xs text-amber-600`, typography.small]}>
              Tips: {formatCurrency(tips)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function StaffPerformanceScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('shift');
  const [shiftData, setShiftData] = useState<ServerPerformance[]>([]);
  const [allData, setAllData] = useState<StaffPerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      if (tab === 'shift') {
        const data = await reportsService.getServerPerformance({ storeId: user?.storeId });
        setShiftData(data ?? []);
      } else {
        const data = await reportsService.getStaffPerformance({
          storeId: user?.storeId,
          limit: 20,
        });
        setAllData(data ?? []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load staff performance');
    } finally {
      setLoading(false);
    }
  }, [tab, user?.storeId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'shift', label: 'Active Servers' },
    { key: 'all', label: 'All Staff' },
  ];

  const currentList =
    tab === 'shift'
      ? shiftData.map((s) => ({
          id: s.serverId,
          name: s.serverName,
          revenue: s.totalRevenue,
          checks: s.totalChecks,
          avgCheck: s.averageCheckAmount,
          tips: s.totalTips,
          covers: s.totalCovers,
        }))
      : allData.map((s) => ({
          id: s.serverId,
          name: s.serverName,
          revenue: s.totalRevenue,
          checks: s.totalChecks,
          avgCheck: s.avgCheckAmount,
          tips: s.totalTips,
          covers: s.totalCovers,
        }));

  const totalRevenue = currentList.reduce((sum, s) => sum + (s.revenue ?? 0), 0);

  return (
    <>
      <Stack.Screen
        options={{ title: 'Staff Performance', headerShown: true, headerBackTitle: 'Back' }}
      />
      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        contentContainerStyle={tw`pb-12`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tab Selector */}
        <View style={tw`flex-row mx-4 mt-4 bg-white rounded-xl p-1`}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                tw`flex-1 py-2 rounded-lg items-center`,
                tab === t.key && tw`bg-blue-500`,
              ]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  tw`text-sm`,
                  typography.captionSemibold,
                  { color: tab === t.key ? '#fff' : '#9CA3AF' },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={tw`py-20 items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : error ? (
          <View style={tw`mx-4 mt-6 bg-red-50 rounded-xl p-4 items-center`}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />
            <Text style={[tw`text-red-600 mt-2 text-center`, typography.caption]}>
              {error}
            </Text>
            <TouchableOpacity
              style={tw`mt-3 bg-red-100 rounded-lg px-4 py-2`}
              onPress={() => { setLoading(true); fetchData(); }}
            >
              <Text style={[tw`text-red-600`, typography.captionSemibold]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={tw`mt-4`}>
            {/* Summary */}
            {currentList.length > 0 && (
              <View style={tw`mx-4 mb-4 bg-white rounded-xl p-4`}>
                <View style={tw`flex-row justify-between`}>
                  <View>
                    <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                      Total Revenue
                    </Text>
                    <Text style={[tw`text-lg`, typography.headingSemibold, { color: '#10B981' }]}>
                      {formatCurrency(totalRevenue)}
                    </Text>
                  </View>
                  <View style={tw`items-end`}>
                    <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                      {tab === 'shift' ? 'Active Servers' : 'Total Staff'}
                    </Text>
                    <Text style={[tw`text-lg`, typography.headingSemibold]}>
                      {currentList.length}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {currentList.length === 0 ? (
              <View style={tw`items-center py-12`}>
                <MaterialCommunityIcons name="account-group-outline" size={48} color="#D1D5DB" />
                <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
                  {tab === 'shift'
                    ? 'No active servers right now'
                    : 'No staff performance data'}
                </Text>
              </View>
            ) : (
              currentList.map((s, idx) => (
                <StaffCard
                  key={s.id ?? idx}
                  rank={idx + 1}
                  name={s.name}
                  revenue={s.revenue}
                  checks={s.checks}
                  avgCheck={s.avgCheck}
                  tips={s.tips}
                  covers={s.covers}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
