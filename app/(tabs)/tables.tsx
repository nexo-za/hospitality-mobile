import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useTables } from '@/contexts/TablesContext';
import { useAuth } from '@/contexts/AuthContext';
import { FloorPlanView } from '@/components/floor-plan/FloorPlanView';
import type { Table } from '@/types/hospitality';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import TableBgPattern from '@/assets/table-bg.svg';

const AUTO_REFRESH_MS = 30_000;

export default function TablesScreen() {
  const { user } = useAuth();
  const {
    tables,
    floorPlans,
    activeFloorPlan,
    sections,
    assignments,
    isLoading,
    error,
    switchFloorPlan,
    refreshTables,
    refreshFloorPlans,
    refreshAssignments,
  } = useTables();
  const router = useRouter();
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);
  const refreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(
    async (storeId?: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        await Promise.all([
          refreshFloorPlans(storeId),
          refreshTables(storeId),
          refreshAssignments(undefined, storeId),
        ]);
      } finally {
        loadingRef.current = false;
      }
    },
    [refreshFloorPlans, refreshTables, refreshAssignments],
  );

  useEffect(() => {
    if (!user || didLoadRef.current) return;
    didLoadRef.current = true;
    const storeId = (user as any).storeId;
    loadAll(storeId).catch(() => undefined);
  }, [user, loadAll]);

  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    const storeId = (user as any)?.storeId;
    setRefreshing(true);
    try {
      loadingRef.current = false;
      await loadAll(storeId);
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  }, [user, loadAll]);

  const handleFloorPlanChange = useCallback(
    (floorPlanId: number) => {
      switchFloorPlan(floorPlanId).catch(() => undefined);
    },
    [switchFloorPlan],
  );

  const handleTablePress = useCallback(
    async (table: Table) => {
      // If table is occupied/reserved and has an active check, go straight to order
      const activeCheckId = table.currentCheckId ?? table.activeCheck?.id;
      if ((table.status === 'OCCUPIED' || table.status === 'RESERVED') && activeCheckId) {
        router.push(`/order/${activeCheckId}` as any);
        return;
      }

      // If table is available, show a modal or go to a quick open screen
      // For now, we will just route to the table detail which we will refactor
      // to automatically prompt for covers.
      router.push(`/table/${table.id}`);
    },
    [router]
  );

  const handleTableLongPress = useCallback(
    (table: Table) => {
      // Route to the detail screen for table management (mark dirty, block, etc.)
      router.push(`/table/${table.id}`);
    },
    [router]
  );

  useRealtimeUpdates({
    storeId: (user as any)?.storeId,
    onTableUpdate: () => {
      const storeId = (user as any)?.storeId;
      refreshTables(storeId).catch(() => undefined);
    },
    onCheckUpdate: () => {
      const storeId = (user as any)?.storeId;
      refreshTables(storeId).catch(() => undefined);
    },
  });

  useEffect(() => {
    if (!user) return;
    const storeId = (user as any).storeId;
    const timer = setInterval(() => {
      refreshTables(storeId).catch(() => undefined);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [user, refreshTables]);

  if (isLoading && tables.length === 0) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <TableBgPattern width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        </View>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[tw`mt-3 text-gray-500`, typography.body]}>
            Loading floor plan...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <TableBgPattern width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      </View>

      {error && (
        <View style={tw`bg-red-50 p-3 rounded-lg m-3 z-10`}>
          <Text style={[tw`text-red-700 text-sm`, typography.body]}>
            {error}
          </Text>
        </View>
      )}

      <FloorPlanView
        tables={tables}
        floorPlans={floorPlans}
        sections={sections}
        assignments={assignments}
        activeFloorPlan={activeFloorPlan}
        onFloorPlanChange={handleFloorPlanChange}
        onTablePress={handleTablePress}
        onTableLongPress={handleTableLongPress}
        currentUserId={(user as any)?.id}
        isLoading={isLoading && !refreshing}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
}
