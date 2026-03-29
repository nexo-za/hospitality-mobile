import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import inventoryCountsService from '@/api/services/inventoryCountsService';
import type { HospitalityInventoryCount } from '@/types/hospitality';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusStyle(status: string): { color: string; bg: string; label: string; icon: IconName } {
  switch (status) {
    case 'IN_PROGRESS':
      return { color: '#F59E0B', bg: '#FEF3C7', label: 'In Progress', icon: 'progress-clock' };
    case 'COMPLETED':
      return { color: '#10B981', bg: '#D1FAE5', label: 'Completed', icon: 'check-circle' };
    case 'APPROVED':
      return { color: '#3B82F6', bg: '#DBEAFE', label: 'Approved', icon: 'check-decagram' };
    default:
      return { color: '#6B7280', bg: '#F3F4F6', label: status, icon: 'help-circle-outline' };
  }
}

export default function InventoryCountsScreen() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<HospitalityInventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await inventoryCountsService.list({
        storeId: user?.storeId,
        limit: 30,
      });
      setCounts(res.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inventory counts');
    } finally {
      setLoading(false);
    }
  }, [user?.storeId]);

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

  const handleStartCount = () => {
    Alert.alert(
      'Start Inventory Count',
      'This will create a new inventory count session for your store. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Count',
          onPress: async () => {
            setCreating(true);
            try {
              await inventoryCountsService.create({ storeId: user?.storeId ?? 0 });
              setLoading(true);
              fetchData();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to create count.');
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  const activeCount = counts.find((c) => c.status === 'IN_PROGRESS');

  return (
    <>
      <Stack.Screen
        options={{ title: 'Inventory Counts', headerShown: true, headerBackTitle: 'Back' }}
      />
      <View style={tw`flex-1 bg-gray-50`}>
        <ScrollView
          contentContainerStyle={tw`pb-24`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={tw`py-20 items-center`}>
              <ActivityIndicator size="large" color="#8B5CF6" />
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
            <>
              {/* Active Count Banner */}
              {activeCount && (
                <View style={tw`mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4`}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <MaterialCommunityIcons
                      name="progress-clock"
                      size={20}
                      color="#F59E0B"
                      style={tw`mr-2`}
                    />
                    <Text style={[tw`text-amber-700`, typography.captionSemibold]}>
                      Count In Progress
                    </Text>
                  </View>
                  <Text style={[tw`text-xs text-amber-600 mb-2`, typography.small]}>
                    Started {formatDate(activeCount.createdAt)}
                    {activeCount.startedByName
                      ? ` by ${activeCount.startedByName}`
                      : ''}
                  </Text>
                  <Text style={[tw`text-xs text-amber-600`, typography.small]}>
                    {activeCount.items?.length ?? 0} items &middot;{' '}
                    {activeCount.items?.filter((i) => i.countedQuantity != null).length ?? 0} counted
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={tw`flex-row mx-4 mt-4 gap-3`}>
                <View style={tw`bg-white rounded-xl p-4 flex-1`}>
                  <Text style={[tw`text-xs text-gray-400`, typography.small]}>Total Counts</Text>
                  <Text style={[tw`text-xl mt-1`, typography.headingSemibold]}>
                    {counts.length}
                  </Text>
                </View>
                <View style={tw`bg-white rounded-xl p-4 flex-1`}>
                  <Text style={[tw`text-xs text-gray-400`, typography.small]}>Approved</Text>
                  <Text
                    style={[
                      tw`text-xl mt-1`,
                      typography.headingSemibold,
                      { color: '#3B82F6' },
                    ]}
                  >
                    {counts.filter((c) => c.status === 'APPROVED').length}
                  </Text>
                </View>
              </View>

              {/* List */}
              <View style={tw`mt-5`}>
                <Text
                  style={[
                    tw`text-xs text-gray-400 px-5 mb-2`,
                    typography.captionSemibold,
                    { letterSpacing: 0.8 },
                  ]}
                >
                  COUNT SESSIONS
                </Text>
                {counts.length === 0 ? (
                  <View style={tw`items-center py-12`}>
                    <MaterialCommunityIcons name="counter" size={48} color="#D1D5DB" />
                    <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
                      No inventory counts yet
                    </Text>
                    <Text style={[tw`text-gray-400 mt-1`, typography.small]}>
                      Tap + to start your first count
                    </Text>
                  </View>
                ) : (
                  <View style={tw`mx-4 bg-white rounded-xl overflow-hidden`}>
                    {counts.map((count, idx) => {
                      const st = getStatusStyle(count.status);
                      const totalItems = count.items?.length ?? 0;
                      const countedItems =
                        count.items?.filter((i) => i.countedQuantity != null).length ?? 0;
                      const varianceItems =
                        count.items?.filter(
                          (i) => i.variance != null && i.variance !== 0
                        ).length ?? 0;

                      return (
                        <View
                          key={count.id}
                          style={tw`px-4 py-3.5 ${
                            idx < counts.length - 1 ? 'border-b border-gray-50' : ''
                          }`}
                        >
                          <View style={tw`flex-row items-center`}>
                            <View
                              style={[
                                tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                                { backgroundColor: st.bg },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name={st.icon}
                                size={18}
                                color={st.color}
                              />
                            </View>
                            <View style={tw`flex-1`}>
                              <View style={tw`flex-row items-center`}>
                                <Text style={[tw`text-sm`, typography.captionSemibold]}>
                                  Count #{count.id}
                                </Text>
                                <View
                                  style={[
                                    tw`ml-2 rounded-full px-2 py-0.5`,
                                    { backgroundColor: st.bg },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      tw`text-xs`,
                                      typography.small,
                                      { color: st.color },
                                    ]}
                                  >
                                    {st.label}
                                  </Text>
                                </View>
                              </View>
                              <Text style={[tw`text-xs text-gray-400 mt-0.5`, typography.small]}>
                                {formatDate(count.createdAt)}
                                {count.startedByName ? ` · ${count.startedByName}` : ''}
                              </Text>
                            </View>
                          </View>
                          <View style={tw`flex-row mt-2 ml-12`}>
                            <View style={tw`flex-row items-center mr-4`}>
                              <MaterialCommunityIcons
                                name="package-variant"
                                size={14}
                                color="#9CA3AF"
                                style={tw`mr-1`}
                              />
                              <Text style={[tw`text-xs text-gray-500`, typography.small]}>
                                {countedItems}/{totalItems} counted
                              </Text>
                            </View>
                            {varianceItems > 0 && (
                              <View style={tw`flex-row items-center`}>
                                <MaterialCommunityIcons
                                  name="alert-outline"
                                  size={14}
                                  color="#F59E0B"
                                  style={tw`mr-1`}
                                />
                                <Text style={[tw`text-xs text-amber-600`, typography.small]}>
                                  {varianceItems} variance{varianceItems !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[
            tw`absolute bottom-6 right-5 w-14 h-14 rounded-full bg-violet-600 items-center justify-center`,
            {
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            },
          ]}
          onPress={handleStartCount}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MaterialCommunityIcons name="plus" size={28} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}
