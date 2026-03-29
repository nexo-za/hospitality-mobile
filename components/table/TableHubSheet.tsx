import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import tablesService from '@/api/services/tablesService';
import type { Table, TableStatus } from '@/types/hospitality';

interface TableHubSheetProps {
  visible: boolean;
  tableId: number | null;
  onClose: () => void;
  onViewOrder: (checkId: number) => void;
  onOpenNewOrder: (table: Table) => void;
  onTransfer: (table: Table) => void;
  onChangeServer: (table: Table) => void;
  onStatusChange: (tableId: number, status: TableStatus) => Promise<void>;
}

const statusBadge: Record<TableStatus, { bg: string; text: string; label: string }> = {
  AVAILABLE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Available' },
  OCCUPIED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Occupied' },
  RESERVED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reserved' },
  BLOCKED: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Blocked' },
  DIRTY: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dirty' },
  CLEANING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Cleaning' },
};

export function TableHubSheet({
  visible,
  tableId,
  onClose,
  onViewOrder,
  onOpenNewOrder,
  onTransfer,
  onChangeServer,
  onStatusChange,
}: TableHubSheetProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!visible || !tableId) {
      setTable(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    tablesService
      .getTable(tableId)
      .then((data) => { if (!cancelled) setTable(data); })
      .catch(() => { if (!cancelled) Alert.alert('Error', 'Failed to load table details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, tableId]);

  const formatElapsed = useCallback((openedAt?: string | null) => {
    if (!openedAt) return '--';
    const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }, []);

  const handleStatusChange = async (status: TableStatus) => {
    if (!table) return;
    setStatusLoading(true);
    try {
      await onStatusChange(table.id, status);
      setTable((prev) => (prev ? { ...prev, status } : null));
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const badge = table ? statusBadge[table.status] : statusBadge.AVAILABLE;
  const check = table?.activeCheck;
  const hasActiveCheck = !!check;
  const isOccupied = table?.status === 'OCCUPIED' || table?.status === 'RESERVED';
  const isDirty = table?.status === 'DIRTY' || table?.status === 'CLEANING';
  const isAvailable = table?.status === 'AVAILABLE';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 bg-black/40`} onPress={onClose}>
        <View style={tw`flex-1`} />
        <Pressable style={tw`bg-white rounded-t-3xl max-h-[80%]`} onPress={() => {}}>
          <View style={tw`items-center pt-3 pb-1`}>
            <View style={tw`w-10 h-1 rounded-full bg-gray-300`} />
          </View>

          {loading ? (
            <View style={tw`py-16 items-center`}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : table ? (
            <ScrollView contentContainerStyle={tw`p-5 pb-10`} bounces={false}>
              {/* Header */}
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <View style={tw`flex-1 mr-3`}>
                  <Text style={[tw`text-xl text-gray-900`, typography.h2]}>
                    {table.name || `Table ${table.tableNumber}`}
                  </Text>
                  <Text style={[tw`text-sm text-gray-400 mt-0.5`, typography.body]}>
                    {table.seats} seats
                  </Text>
                </View>
                <View style={tw`${badge.bg} px-3 py-1.5 rounded-full`}>
                  <Text style={[tw`${badge.text} text-xs font-bold`]}>{badge.label}</Text>
                </View>
              </View>

              {/* Active Check Card */}
              {hasActiveCheck && (
                <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
                  <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
                    Active Check
                  </Text>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <Text style={[tw`text-gray-500`, typography.body]}>Order</Text>
                    <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                      #{check!.checkNumber || check!.id}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <Text style={[tw`text-gray-500`, typography.body]}>Total</Text>
                    <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                      R{check!.grandTotal?.toFixed(2) ?? '0.00'}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <Text style={[tw`text-gray-500`, typography.body]}>Guests</Text>
                    <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                      {check!.guestCount}
                    </Text>
                  </View>
                  {check!.serverName && (
                    <View style={tw`flex-row justify-between mb-2`}>
                      <Text style={[tw`text-gray-500`, typography.body]}>Server</Text>
                      <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                        {check!.serverName}
                      </Text>
                    </View>
                  )}
                  <View style={tw`flex-row justify-between`}>
                    <Text style={[tw`text-gray-500`, typography.body]}>Time</Text>
                    <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                      {formatElapsed(check!.openedAt)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Primary Action */}
              {hasActiveCheck && (
                <TouchableOpacity
                  style={tw`bg-indigo-600 rounded-2xl py-4 items-center mb-3 shadow-sm`}
                  onPress={() => {
                    const checkId = table.currentCheckId ?? check!.id;
                    onClose();
                    onViewOrder(checkId);
                  }}
                >
                  <Text style={[tw`text-white text-base`, typography.bodySemibold]}>View Order</Text>
                </TouchableOpacity>
              )}

              {isAvailable && (
                <TouchableOpacity
                  style={tw`bg-blue-600 rounded-2xl py-4 items-center mb-3 shadow-sm flex-row justify-center`}
                  onPress={() => {
                    onClose();
                    onOpenNewOrder(table);
                  }}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color="white" />
                  <Text style={[tw`text-white text-base ml-2`, typography.bodySemibold]}>
                    Open New Order
                  </Text>
                </TouchableOpacity>
              )}

              {isDirty && (
                <TouchableOpacity
                  style={tw`bg-green-600 rounded-2xl py-4 items-center mb-3 shadow-sm flex-row justify-center ${statusLoading ? 'opacity-70' : ''}`}
                  onPress={() => handleStatusChange('AVAILABLE')}
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle-outline" size={20} color="white" />
                      <Text style={[tw`text-white text-base ml-2`, typography.bodySemibold]}>
                        Mark Available
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Secondary Actions */}
              {isOccupied && hasActiveCheck && (
                <View style={tw`bg-gray-50 rounded-2xl overflow-hidden mb-4`}>
                  <TouchableOpacity
                    style={tw`flex-row items-center px-4 py-3.5 border-b border-gray-200`}
                    onPress={() => { onClose(); onTransfer(table); }}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={20} color="#548AF7" />
                    <Text style={[tw`text-gray-800 ml-3 flex-1`, typography.bodySemibold]}>
                      Transfer Table
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`flex-row items-center px-4 py-3.5`}
                    onPress={() => { onClose(); onChangeServer(table); }}
                  >
                    <MaterialCommunityIcons name="account-switch" size={20} color="#548AF7" />
                    <Text style={[tw`text-gray-800 ml-3 flex-1`, typography.bodySemibold]}>
                      Change Server
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual Status Overrides - only for statuses that can't be automated */}
              {!isDirty && (
                <View style={tw`mt-2`}>
                  <Text style={[tw`text-xs text-gray-400 uppercase mb-2 ml-1`, typography.captionSemibold]}>
                    Status Override
                  </Text>
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {table.status !== 'BLOCKED' && (
                      <TouchableOpacity
                        style={tw`px-4 py-2.5 rounded-full border border-gray-300 bg-gray-50`}
                        onPress={() => handleStatusChange('BLOCKED')}
                        disabled={statusLoading}
                      >
                        <Text style={[tw`text-gray-600`, typography.captionSemibold]}>Block</Text>
                      </TouchableOpacity>
                    )}
                    {table.status === 'BLOCKED' && (
                      <TouchableOpacity
                        style={tw`px-4 py-2.5 rounded-full border border-green-300 bg-green-50`}
                        onPress={() => handleStatusChange('AVAILABLE')}
                        disabled={statusLoading}
                      >
                        <Text style={[tw`text-green-700`, typography.captionSemibold]}>Unblock</Text>
                      </TouchableOpacity>
                    )}
                    {table.status !== 'RESERVED' && !hasActiveCheck && (
                      <TouchableOpacity
                        style={tw`px-4 py-2.5 rounded-full border border-blue-300 bg-blue-50`}
                        onPress={() => handleStatusChange('RESERVED')}
                        disabled={statusLoading}
                      >
                        <Text style={[tw`text-blue-700`, typography.captionSemibold]}>Reserve</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={tw`py-16 items-center`}>
              <Text style={[tw`text-gray-500`, typography.body]}>Table not found</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
