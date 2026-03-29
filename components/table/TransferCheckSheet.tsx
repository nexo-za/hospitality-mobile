import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import api from '@/api/api';
import type { Table, Check } from '@/types/hospitality';

type TransferMode = 'table' | 'server';

interface ActiveServer {
  id: number;
  firstName: string;
  lastName: string;
  shiftId: number;
}

interface TransferCheckSheetProps {
  visible: boolean;
  check: Check | null;
  currentTable: Table | null;
  availableTables: Table[];
  storeId: number | null;
  onClose: () => void;
  onTransferToTable: (checkId: number, fromTableId: number, toTableId: number) => Promise<void>;
  onTransferToServer: (checkId: number, fromServerId: number, toServerId: number) => Promise<void>;
}

export function TransferCheckSheet({
  visible,
  check,
  currentTable,
  availableTables,
  storeId,
  onClose,
  onTransferToTable,
  onTransferToServer,
}: TransferCheckSheetProps) {
  const [mode, setMode] = useState<TransferMode>('table');
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<ActiveServer[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMode('table');
      setServers([]);
      return;
    }
  }, [visible]);

  const loadServers = useCallback(async () => {
    if (!storeId) return;
    setLoadingServers(true);
    try {
      const res = await api.get<any>('/shifts/active-servers', { params: { storeId } });
      const data = res.data?.data || res.data || [];
      setServers(Array.isArray(data) ? data : []);
    } catch {
      setServers([]);
    } finally {
      setLoadingServers(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (visible && mode === 'server') {
      loadServers();
    }
  }, [visible, mode, loadServers]);

  const handleTransferTable = async (targetTable: Table) => {
    if (!check || !currentTable) return;
    Alert.alert(
      'Transfer Check',
      `Move check #${check.checkNumber} to ${targetTable.name || `Table ${targetTable.tableNumber}`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            setLoading(true);
            try {
              await onTransferToTable(check.id, currentTable.id, targetTable.id);
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Transfer failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleTransferServer = async (server: ActiveServer) => {
    if (!check) return;
    Alert.alert(
      'Change Server',
      `Reassign check #${check.checkNumber} to ${server.firstName} ${server.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reassign',
          onPress: async () => {
            setLoading(true);
            try {
              await onTransferToServer(check.id, check.serverId ?? 0, server.id);
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Transfer failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (!check) return null;

  const targetTables = availableTables.filter(
    (t) => t.status === 'AVAILABLE' && t.id !== currentTable?.id,
  );

  const otherServers = servers.filter((s) => s.id !== check.serverId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 bg-black/40`} onPress={onClose}>
        <View style={tw`flex-1`} />
        <Pressable style={tw`bg-white rounded-t-3xl max-h-[85%]`} onPress={() => {}}>
          <View style={tw`items-center pt-3 pb-1`}>
            <View style={tw`w-10 h-1 rounded-full bg-gray-300`} />
          </View>

          {/* Header */}
          <View style={tw`flex-row items-center justify-between px-5 py-3 border-b border-gray-100`}>
            <View>
              <Text style={[tw`text-lg text-gray-900`, typography.headingSemibold]}>
                Transfer Check #{check.checkNumber}
              </Text>
              {currentTable && (
                <Text style={[tw`text-sm text-gray-400`, typography.body]}>
                  From {currentTable.name || `Table ${currentTable.tableNumber}`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Mode Tabs */}
          <View style={tw`flex-row mx-5 mt-4 mb-3 bg-gray-100 rounded-xl p-1`}>
            <TouchableOpacity
              style={tw`flex-1 py-2.5 rounded-lg items-center ${mode === 'table' ? 'bg-white shadow-sm' : ''}`}
              onPress={() => setMode('table')}
            >
              <Text style={[tw`text-sm ${mode === 'table' ? 'text-gray-900 font-bold' : 'text-gray-500'}`]}>
                To Table
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 py-2.5 rounded-lg items-center ${mode === 'server' ? 'bg-white shadow-sm' : ''}`}
              onPress={() => setMode('server')}
            >
              <Text style={[tw`text-sm ${mode === 'server' ? 'text-gray-900 font-bold' : 'text-gray-500'}`]}>
                To Server
              </Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={tw`py-8 items-center`}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={tw`text-gray-500 mt-2`}>Transferring...</Text>
            </View>
          )}

          {!loading && mode === 'table' && (
            <FlatList
              data={targetTables}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={tw`px-5 pb-10`}
              ListEmptyComponent={
                <View style={tw`py-12 items-center`}>
                  <MaterialCommunityIcons name="table-off" size={40} color="#9CA3AF" />
                  <Text style={[tw`text-gray-500 mt-3`, typography.body]}>
                    No available tables
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={tw`flex-row items-center py-3.5 border-b border-gray-100`}
                  onPress={() => handleTransferTable(item)}
                >
                  <View style={tw`w-10 h-10 rounded-xl bg-green-50 items-center justify-center mr-3`}>
                    <MaterialCommunityIcons name="table-furniture" size={20} color="#16A34A" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                      {item.name || `Table ${item.tableNumber}`}
                    </Text>
                    <Text style={[tw`text-gray-400 text-xs`, typography.caption]}>
                      {item.seats} seats
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            />
          )}

          {!loading && mode === 'server' && (
            <>
              {loadingServers ? (
                <View style={tw`py-8 items-center`}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : (
                <FlatList
                  data={otherServers}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={tw`px-5 pb-10`}
                  ListEmptyComponent={
                    <View style={tw`py-12 items-center`}>
                      <MaterialCommunityIcons name="account-off" size={40} color="#9CA3AF" />
                      <Text style={[tw`text-gray-500 mt-3`, typography.body]}>
                        No other active servers
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={tw`flex-row items-center py-3.5 border-b border-gray-100`}
                      onPress={() => handleTransferServer(item)}
                    >
                      <View style={tw`w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3`}>
                        <Text style={tw`text-blue-700 font-bold`}>
                          {item.firstName[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                          {item.firstName} {item.lastName}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
