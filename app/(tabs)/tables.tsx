import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useTables } from '@/contexts/TablesContext';
import { useOrder } from '@/contexts/OrderContext';
import { useAuth } from '@/contexts/AuthContext';
import { FloorPlanView } from '@/components/floor-plan/FloorPlanView';
import { NewOrderSheet } from '@/components/table/NewOrderSheet';
import { TurnoverSheet } from '@/components/table/TurnoverSheet';
import { TableHubSheet } from '@/components/table/TableHubSheet';
import { TransferCheckSheet } from '@/components/table/TransferCheckSheet';
import type { Table, TableStatus } from '@/types/hospitality';
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
    updateTableStatus,
  } = useTables();
  const { createCheck, transferCheck } = useOrder();
  const router = useRouter();
  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);
  const refreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sheet state
  const [newOrderTable, setNewOrderTable] = useState<Table | null>(null);
  const [turnoverTable, setTurnoverTable] = useState<Table | null>(null);
  const [hubTableId, setHubTableId] = useState<number | null>(null);
  const [transferTable, setTransferTable] = useState<Table | null>(null);
  const [transferCheck_, setTransferCheck] = useState<any>(null);

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
    (table: Table) => {
      const activeCheckId = table.currentCheckId ?? table.activeCheck?.id;

      if ((table.status === 'OCCUPIED' || table.status === 'RESERVED') && activeCheckId) {
        router.push(`/order/${activeCheckId}` as any);
        return;
      }

      if (table.status === 'AVAILABLE') {
        setNewOrderTable(table);
        return;
      }

      if (table.status === 'DIRTY' || table.status === 'CLEANING') {
        setTurnoverTable(table);
        return;
      }

      setHubTableId(table.id);
    },
    [router],
  );

  const handleTableLongPress = useCallback((table: Table) => {
    setHubTableId(table.id);
  }, []);

  const handleStatusChange = useCallback(
    async (tableId: number, status: TableStatus) => {
      await updateTableStatus(tableId, status);
    },
    [updateTableStatus],
  );

  const handleCreateOrder = useCallback(
    async (guestCount: number, guestProfileId?: number) => {
      if (!newOrderTable || !user) return;
      const check = await createCheck({
        storeId: (user as any).storeId,
        tableId: newOrderTable.id,
        checkType: 'DINE_IN',
        guestCount,
        guestProfileId,
      });
      setNewOrderTable(null);
      router.push(`/order/${check.id}` as any);
    },
    [newOrderTable, user, createCheck, router],
  );

  const handleTransferToTable = useCallback(
    async (checkId: number, fromTableId: number, toTableId: number) => {
      await transferCheck(checkId, {
        transferType: 'TABLE',
        fromTableId,
        toTableId,
      });
      const storeId = (user as any)?.storeId;
      refreshTables(storeId).catch(() => undefined);
    },
    [transferCheck, user, refreshTables],
  );

  const handleTransferToServer = useCallback(
    async (checkId: number, fromServerId: number, toServerId: number) => {
      await transferCheck(checkId, {
        transferType: 'SERVER',
        fromServerId,
        toServerId,
      });
    },
    [transferCheck],
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
        isLoading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* New Order Sheet (available tables) */}
      <NewOrderSheet
        visible={!!newOrderTable}
        table={newOrderTable}
        onClose={() => setNewOrderTable(null)}
        onCreateOrder={handleCreateOrder}
      />

      {/* Quick Turnover Sheet (dirty/cleaning tables) */}
      <TurnoverSheet
        visible={!!turnoverTable}
        table={turnoverTable}
        onClose={() => setTurnoverTable(null)}
        onStatusChange={handleStatusChange}
      />

      {/* Table Hub Sheet (long-press management) */}
      <TableHubSheet
        visible={!!hubTableId}
        tableId={hubTableId}
        onClose={() => setHubTableId(null)}
        onViewOrder={(checkId) => router.push(`/order/${checkId}` as any)}
        onOpenNewOrder={(table) => setNewOrderTable(table)}
        onTransfer={(table) => {
          const check = table.activeCheck;
          if (!check) {
            Alert.alert('No Active Check', 'This table has no active check to transfer.');
            return;
          }
          setTransferTable(table);
          setTransferCheck({
            id: check.id,
            checkNumber: check.checkNumber,
            serverId: check.serverId,
          });
        }}
        onChangeServer={(table) => {
          const check = table.activeCheck;
          if (!check) {
            Alert.alert('No Active Check', 'This table has no active check to reassign.');
            return;
          }
          setTransferTable(table);
          setTransferCheck({
            id: check.id,
            checkNumber: check.checkNumber,
            serverId: check.serverId,
          });
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Transfer Check Sheet */}
      <TransferCheckSheet
        visible={!!transferTable && !!transferCheck_}
        check={transferCheck_}
        currentTable={transferTable}
        availableTables={tables}
        storeId={(user as any)?.storeId ?? null}
        onClose={() => { setTransferTable(null); setTransferCheck(null); }}
        onTransferToTable={handleTransferToTable}
        onTransferToServer={handleTransferToServer}
      />
    </View>
  );
}
