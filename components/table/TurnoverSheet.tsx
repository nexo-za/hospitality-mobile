import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import type { Table, TableStatus } from '@/types/hospitality';

interface TurnoverSheetProps {
  visible: boolean;
  table: Table | null;
  onClose: () => void;
  onStatusChange: (tableId: number, status: TableStatus) => Promise<void>;
}

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  DIRTY: { label: 'Needs Cleaning', icon: 'silverware-clean', color: 'text-red-600' },
  CLEANING: { label: 'Being Cleaned', icon: 'broom', color: 'text-amber-600' },
};

export function TurnoverSheet({ visible, table, onClose, onStatusChange }: TurnoverSheetProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkAvailable = async () => {
    if (!table) return;
    setLoading(true);
    try {
      await onStatusChange(table.id, 'AVAILABLE');
      onClose();
    } catch {
      // Error handled upstream
    } finally {
      setLoading(false);
    }
  };

  if (!table) return null;

  const config = statusConfig[table.status] || statusConfig.DIRTY;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 bg-black/40`} onPress={onClose}>
        <View style={tw`flex-1`} />
        <Pressable style={tw`bg-white rounded-t-3xl`} onPress={() => {}}>
          <View style={tw`items-center pt-3 pb-1`}>
            <View style={tw`w-10 h-1 rounded-full bg-gray-300`} />
          </View>

          <View style={tw`p-6 pb-10`}>
            <View style={tw`flex-row items-center mb-2`}>
              <MaterialCommunityIcons
                name={config.icon as any}
                size={24}
                color={table.status === 'DIRTY' ? '#DC2626' : '#D97706'}
              />
              <Text style={[tw`text-xl text-gray-900 ml-3`, typography.h2]}>
                {table.name || `Table ${table.tableNumber}`}
              </Text>
            </View>
            <Text style={[tw`${config.color} text-sm mb-6`, typography.bodySemibold]}>
              {config.label}
            </Text>

            <TouchableOpacity
              style={tw`bg-green-600 rounded-2xl py-5 items-center shadow-sm flex-row justify-center ${loading ? 'opacity-70' : ''}`}
              onPress={handleMarkAvailable}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={24} color="white" />
                  <Text style={[tw`text-white text-lg ml-3`, typography.bodySemibold]}>
                    Mark Available
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
