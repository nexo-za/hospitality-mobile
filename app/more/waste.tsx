import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import wasteService from '@/api/services/wasteService';
import type { WasteLog, WasteSummary } from '@/types/hospitality';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const WASTE_TYPES: { key: string; label: string; icon: IconName; color: string }[] = [
  { key: 'SPOILAGE', label: 'Spoilage', icon: 'bacteria', color: '#EF4444' },
  { key: 'OVERPRODUCTION', label: 'Over-production', icon: 'food-off', color: '#F59E0B' },
  { key: 'PREP_WASTE', label: 'Prep Waste', icon: 'knife', color: '#F97316' },
  { key: 'RETURNED', label: 'Returned', icon: 'undo-variant', color: '#8B5CF6' },
  { key: 'EXPIRED', label: 'Expired', icon: 'calendar-remove', color: '#EC4899' },
  { key: 'OTHER', label: 'Other', icon: 'dots-horizontal', color: '#6B7280' },
];

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return 'R0.00';
  return `R${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getWasteTypeInfo(type: string) {
  return WASTE_TYPES.find((t) => t.key === type) || WASTE_TYPES[WASTE_TYPES.length - 1];
}

export default function WasteScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [summary, setSummary] = useState<WasteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('SPOILAGE');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('ea');
  const [formCost, setFormCost] = useState('');
  const [formReason, setFormReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [logsRes, summaryRes] = await Promise.allSettled([
        wasteService.list({ storeId: user?.storeId, limit: 50 }),
        wasteService.getSummary({ storeId: user?.storeId }),
      ]);
      if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data ?? []);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load waste data');
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

  const resetForm = () => {
    setFormName('');
    setFormType('SPOILAGE');
    setFormQty('');
    setFormUnit('ea');
    setFormCost('');
    setFormReason('');
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return Alert.alert('Required', 'Enter an item name.');
    const qty = parseFloat(formQty);
    const cost = parseFloat(formCost);
    if (isNaN(qty) || qty <= 0) return Alert.alert('Required', 'Enter a valid quantity.');
    if (isNaN(cost) || cost < 0) return Alert.alert('Required', 'Enter a valid cost per unit.');

    setSubmitting(true);
    try {
      await wasteService.create({
        storeId: user?.storeId ?? 0,
        itemName: formName.trim(),
        wasteType: formType as any,
        quantity: qty,
        unit: formUnit || 'ea',
        costPerUnit: cost,
        reason: formReason.trim() || undefined,
      });
      setShowForm(false);
      resetForm();
      setLoading(true);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to log waste.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Waste Log', headerShown: true, headerBackTitle: 'Back' }} />
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
              <ActivityIndicator size="large" color="#EF4444" />
            </View>
          ) : error ? (
            <View style={tw`mx-4 mt-6 bg-red-50 rounded-xl p-4 items-center`}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />
              <Text style={[tw`text-red-600 mt-2 text-center`, typography.caption]}>{error}</Text>
              <TouchableOpacity
                style={tw`mt-3 bg-red-100 rounded-lg px-4 py-2`}
                onPress={() => { setLoading(true); fetchData(); }}
              >
                <Text style={[tw`text-red-600`, typography.captionSemibold]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Summary Cards */}
              {summary && (
                <View style={tw`mx-4 mt-4`}>
                  <View style={tw`bg-white rounded-xl p-4 mb-3`}>
                    <View style={tw`flex-row justify-between items-center`}>
                      <View>
                        <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                          Total Waste Cost
                        </Text>
                        <Text
                          style={[tw`text-xl`, typography.headingSemibold, { color: '#EF4444' }]}
                        >
                          {formatCurrency(summary.totalWasteCost)}
                        </Text>
                      </View>
                      <View style={tw`items-end`}>
                        <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                          Total Items
                        </Text>
                        <Text style={[tw`text-xl`, typography.headingSemibold]}>
                          {summary.totalItems}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {summary.byType && summary.byType.length > 0 && (
                    <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                      {summary.byType.map((t) => {
                        const info = getWasteTypeInfo(t.wasteType);
                        return (
                          <View
                            key={t.wasteType}
                            style={[
                              tw`bg-white rounded-lg px-3 py-2 flex-row items-center`,
                              { minWidth: '47%' },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={info.icon}
                              size={16}
                              color={info.color}
                              style={tw`mr-2`}
                            />
                            <View>
                              <Text style={[tw`text-xs text-gray-500`, typography.small]}>
                                {info.label}
                              </Text>
                              <Text style={[tw`text-sm`, typography.captionSemibold]}>
                                {t.count} &middot; {formatCurrency(t.totalCost)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Waste Entries */}
              <View style={tw`mt-2`}>
                <Text
                  style={[
                    tw`text-xs text-gray-400 px-5 mb-2`,
                    typography.captionSemibold,
                    { letterSpacing: 0.8 },
                  ]}
                >
                  RECENT ENTRIES
                </Text>
                {logs.length === 0 ? (
                  <View style={tw`items-center py-12`}>
                    <MaterialCommunityIcons
                      name="delete-empty-outline"
                      size={48}
                      color="#D1D5DB"
                    />
                    <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
                      No waste logged yet
                    </Text>
                  </View>
                ) : (
                  <View style={tw`mx-4 bg-white rounded-xl overflow-hidden`}>
                    {logs.map((log, idx) => {
                      const info = getWasteTypeInfo(log.wasteType);
                      return (
                        <View
                          key={log.id}
                          style={tw`px-4 py-3.5 ${
                            idx < logs.length - 1 ? 'border-b border-gray-50' : ''
                          }`}
                        >
                          <View style={tw`flex-row items-center`}>
                            <View
                              style={[
                                tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                                { backgroundColor: info.color + '12' },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name={info.icon}
                                size={18}
                                color={info.color}
                              />
                            </View>
                            <View style={tw`flex-1`}>
                              <Text
                                style={[tw`text-sm`, typography.captionSemibold]}
                                numberOfLines={1}
                              >
                                {log.itemName}
                              </Text>
                              <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                                {info.label} &middot; {log.quantity} {log.unit}
                              </Text>
                            </View>
                            <View style={tw`items-end`}>
                              <Text
                                style={[
                                  tw`text-sm`,
                                  typography.captionSemibold,
                                  { color: '#EF4444' },
                                ]}
                              >
                                {formatCurrency(log.totalCost)}
                              </Text>
                              <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                                {formatDate(log.createdAt)}
                              </Text>
                            </View>
                          </View>
                          {log.reason ? (
                            <Text
                              style={[tw`text-xs text-gray-400 mt-1 ml-12`, typography.small]}
                              numberOfLines={2}
                            >
                              {log.reason}
                            </Text>
                          ) : null}
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
            tw`absolute bottom-6 right-5 w-14 h-14 rounded-full bg-red-500 items-center justify-center`,
            {
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            },
          ]}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Log Waste Modal */}
        <Modal
          visible={showForm}
          animationType="slide"
          transparent
          onRequestClose={() => setShowForm(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={tw`flex-1 justify-end`}
          >
            <TouchableOpacity
              style={tw`flex-1`}
              activeOpacity={1}
              onPress={() => setShowForm(false)}
            />
            <View style={tw`bg-white rounded-t-3xl px-5 pt-5 pb-8`}>
              <View style={tw`flex-row items-center justify-between mb-5`}>
                <Text style={[tw`text-lg`, typography.headingSemibold]}>Log Waste</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={[tw`text-xs text-gray-500 mb-1`, typography.smallMedium]}>
                Item Name
              </Text>
              <TextInput
                style={tw`bg-gray-50 rounded-lg px-3 py-3 text-base mb-3`}
                placeholder="e.g. Chicken breast"
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={[tw`text-xs text-gray-500 mb-1`, typography.smallMedium]}>
                Waste Type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={tw`mb-3`}
              >
                {WASTE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      tw`mr-2 px-3 py-2 rounded-lg flex-row items-center`,
                      {
                        backgroundColor:
                          formType === t.key ? t.color + '15' : '#F3F4F6',
                        borderWidth: formType === t.key ? 1 : 0,
                        borderColor: t.color + '40',
                      },
                    ]}
                    onPress={() => setFormType(t.key)}
                  >
                    <MaterialCommunityIcons
                      name={t.icon}
                      size={16}
                      color={formType === t.key ? t.color : '#9CA3AF'}
                      style={tw`mr-1`}
                    />
                    <Text
                      style={[
                        tw`text-sm`,
                        typography.captionMedium,
                        { color: formType === t.key ? t.color : '#6B7280' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={tw`flex-row gap-3 mb-3`}>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-xs text-gray-500 mb-1`, typography.smallMedium]}>
                    Quantity
                  </Text>
                  <TextInput
                    style={tw`bg-gray-50 rounded-lg px-3 py-3 text-base`}
                    placeholder="0"
                    value={formQty}
                    onChangeText={setFormQty}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={[tw`text-xs text-gray-500 mb-1`, typography.smallMedium]}>
                    Unit
                  </Text>
                  <TextInput
                    style={tw`bg-gray-50 rounded-lg px-3 py-3 text-base`}
                    placeholder="ea"
                    value={formUnit}
                    onChangeText={setFormUnit}
                  />
                </View>
              </View>

              <Text style={[tw`text-xs text-gray-500 mb-1`, typography.smallMedium]}>
                Cost per Unit (R)
              </Text>
              <TextInput
                style={tw`bg-gray-50 rounded-lg px-3 py-3 text-base mb-3`}
                placeholder="0.00"
                value={formCost}
                onChangeText={setFormCost}
                keyboardType="decimal-pad"
              />

              <Text style={[tw`text-xs text-gray-500 mb-1`, typography.smallMedium]}>
                Reason (optional)
              </Text>
              <TextInput
                style={tw`bg-gray-50 rounded-lg px-3 py-3 text-base mb-4`}
                placeholder="Why was this wasted?"
                value={formReason}
                onChangeText={setFormReason}
                multiline
              />

              <TouchableOpacity
                style={[
                  tw`rounded-xl py-3.5 items-center`,
                  { backgroundColor: submitting ? '#FCA5A5' : '#EF4444' },
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                    Log Waste
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}
