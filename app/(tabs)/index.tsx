import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useTables } from '@/contexts/TablesContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import reportsService from '@/api/services/reportsService';
import type { WaiterPerformance, LiveOperations, Table } from '@/types/hospitality';

function StatCard({
  icon,
  label,
  value,
  color = '#3B82F6',
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={tw`flex-1 bg-white rounded-xl p-4 mx-1`}>
      <View style={tw`flex-row items-center mb-2`}>
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={color}
        />
        <Text style={[tw`text-xs text-gray-400 ml-1`, typography.caption]}>
          {label}
        </Text>
      </View>
      <Text style={[tw`text-lg`, typography.headingSemibold]}>{value}</Text>
    </View>
  );
}

function formatElapsed(openedAt?: string | null): string {
  if (!openedAt) return '--';
  const diff = Date.now() - new Date(openedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function ActiveTableCard({ table }: { table: Table }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={tw`bg-white rounded-xl p-4 mr-3 w-36 border border-gray-100`}
      onPress={() => router.push(`/table/${table.id}`)}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center mb-2`}>
        <View
          style={tw`w-8 h-8 rounded-full bg-blue-50 items-center justify-center`}
        >
          <MaterialCommunityIcons
            name="table-furniture"
            size={16}
            color="#3B82F6"
          />
        </View>
        <Text
          style={[tw`text-sm ml-2 flex-1`, typography.bodySemibold]}
          numberOfLines={1}
        >
          {table.name || `T${table.tableNumber}`}
        </Text>
      </View>
      <View style={tw`flex-row items-center`}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={12}
          color="#9CA3AF"
        />
        <Text style={[tw`text-xs text-gray-400 ml-1`, typography.caption]}>
          {formatElapsed(table.checkOpenedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
  color = '#3B82F6',
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={tw`flex-1 bg-white rounded-xl py-4 mx-1 items-center border border-gray-100`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          tw`w-10 h-10 rounded-full items-center justify-center mb-2`,
          { backgroundColor: color + '15' },
        ]}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={color}
        />
      </View>
      <Text
        style={[tw`text-xs text-gray-600 text-center`, typography.captionSemibold]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { myTables } = useTables();
  const [performance, setPerformance] = useState<WaiterPerformance | null>(
    null,
  );
  const [liveOps, setLiveOps] = useState<LiveOperations | null>(null);
  const [loading, setLoading] = useState(true);

  const occupiedTables = myTables.filter((t) => t.status === 'OCCUPIED');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const storeId = (user as any).storeId;
    try {
      const [perf, ops] = await Promise.allSettled([
        reportsService.getWaiterCurrentShift(storeId),
        reportsService.getLiveOperations(storeId),
      ]);
      if (perf.status === 'fulfilled') setPerformance(perf.value);
      if (ops.status === 'fulfilled') setLiveOps(ops.value);
    } catch {
      // partial load is fine
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !performance && !liveOps) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[tw`mt-3 text-gray-500`, typography.body]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`pb-8`}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {/* Greeting */}
      <View style={tw`px-4 pt-4 pb-2`}>
        <Text style={[tw`text-lg`, typography.headingSemibold]}>
          Hi, {(user as any)?.firstName || 'there'}
        </Text>
        <Text style={[tw`text-sm text-gray-500`, typography.body]}>
          {performance?.hasActiveShift
            ? 'Your shift is active'
            : 'No active shift'}
        </Text>
      </View>

      {/* My Active Tables */}
      {occupiedTables.length > 0 && (
        <>
          <Text
            style={[
              tw`text-xs text-gray-400 uppercase px-4 mt-4 mb-2`,
              typography.captionSemibold,
            ]}
          >
            My Active Tables
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-4 pb-2`}
          >
            {occupiedTables.map((table) => (
              <ActiveTableCard key={table.id} table={table} />
            ))}
          </ScrollView>
        </>
      )}

      {/* My Shift Performance */}
      {performance && (
        <>
          <Text
            style={[
              tw`text-xs text-gray-400 uppercase px-4 mt-4 mb-2`,
              typography.captionSemibold,
            ]}
          >
            My Shift Performance
          </Text>
          <View style={tw`flex-row px-3`}>
            <StatCard
              icon="cash-multiple"
              label="Revenue"
              value={`R${performance.totalRevenue?.toFixed(2) || '0.00'}`}
              color="#10B981"
            />
            <StatCard
              icon="clipboard-text"
              label="Checks"
              value={String(performance.totalChecks || 0)}
              color="#3B82F6"
            />
          </View>
          <View style={tw`flex-row px-3 mt-2`}>
            <StatCard
              icon="hand-coin"
              label="Tips"
              value={`R${performance.totalTips?.toFixed(2) || '0.00'}`}
              color="#F59E0B"
            />
            <StatCard
              icon="account-multiple"
              label="Covers"
              value={String(performance.totalCovers || 0)}
              color="#8B5CF6"
            />
          </View>
          <View style={tw`flex-row px-3 mt-2`}>
            <StatCard
              icon="chart-line"
              label="Avg Check"
              value={`R${performance.avgCheckAmount?.toFixed(2) || '0.00'}`}
              color="#EC4899"
            />
            <StatCard
              icon="currency-usd"
              label="Rev/Cover"
              value={`R${performance.revenuePerCover?.toFixed(2) || '0.00'}`}
              color="#14B8A6"
            />
          </View>
        </>
      )}

      {/* Live Operations */}
      {liveOps && (
        <>
          <Text
            style={[
              tw`text-xs text-gray-400 uppercase px-4 mt-6 mb-2`,
              typography.captionSemibold,
            ]}
          >
            Live Operations
          </Text>
          <View style={tw`bg-white mx-4 rounded-xl p-4`}>
            <View style={tw`flex-row justify-between mb-3`}>
              <View style={tw`items-center flex-1`}>
                <Text
                  style={[tw`text-2xl text-blue-600`, typography.headingSemibold]}
                >
                  {liveOps.openTables}/{liveOps.totalTables}
                </Text>
                <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
                  Tables Occupied
                </Text>
              </View>
              <View style={tw`items-center flex-1`}>
                <Text
                  style={[tw`text-2xl text-green-600`, typography.headingSemibold]}
                >
                  {liveOps.activeChecks}
                </Text>
                <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
                  Active Checks
                </Text>
              </View>
              <View style={tw`items-center flex-1`}>
                <Text
                  style={[tw`text-2xl text-purple-600`, typography.headingSemibold]}
                >
                  {liveOps.activeServers}
                </Text>
                <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
                  Active Servers
                </Text>
              </View>
            </View>
            <View
              style={tw`border-t border-gray-100 pt-3 flex-row justify-between`}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color="#6B7280"
                />
                <Text
                  style={[tw`text-xs text-gray-500 ml-1`, typography.caption]}
                >
                  Avg table: {liveOps.averageTableTime}min
                </Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons
                  name="clipboard-list"
                  size={14}
                  color="#6B7280"
                />
                <Text
                  style={[tw`text-xs text-gray-500 ml-1`, typography.caption]}
                >
                  Waitlist: {liveOps.waitlistCount}
                </Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={14}
                  color="#6B7280"
                />
                <Text
                  style={[tw`text-xs text-gray-500 ml-1`, typography.caption]}
                >
                  Reservations: {liveOps.reservationsPending}
                </Text>
              </View>
            </View>
          </View>

          <View style={tw`bg-white mx-4 rounded-xl p-4 mt-3`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={[tw`text-sm text-gray-500`, typography.body]}>
                Current Revenue
              </Text>
              <Text
                style={[tw`text-xl text-green-600`, typography.headingSemibold]}
              >
                R{liveOps.currentRevenue?.toFixed(2)}
              </Text>
            </View>
          </View>
        </>
      )}

      {!performance && !liveOps && !loading && (
        <View style={tw`items-center py-16`}>
          <MaterialCommunityIcons
            name="view-dashboard"
            size={48}
            color="#9CA3AF"
          />
          <Text
            style={[tw`text-gray-400 mt-3 text-center px-8`, typography.body]}
          >
            Open a shift to see your performance dashboard
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <Text
        style={[
          tw`text-xs text-gray-400 uppercase px-4 mt-6 mb-2`,
          typography.captionSemibold,
        ]}
      >
        Quick Actions
      </Text>
      <View style={tw`flex-row px-3`}>
        <QuickActionButton
          icon="floor-plan"
          label="Floor Plan"
          onPress={() => router.push('/(tabs)/tables')}
          color="#3B82F6"
        />
        <QuickActionButton
          icon="plus-circle"
          label="New Order"
          onPress={() => router.push('/order/new')}
          color="#10B981"
        />
        <QuickActionButton
          icon="food"
          label="View Menu"
          onPress={() => router.push('/(tabs)/menu')}
          color="#8B5CF6"
        />
        <QuickActionButton
          icon="cash-register"
          label="Cash Till"
          onPress={() => router.push('/more/cash-till')}
          color="#F59E0B"
        />
      </View>
    </ScrollView>
  );
}
