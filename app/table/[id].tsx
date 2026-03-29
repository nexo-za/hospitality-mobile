import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useTables } from '@/contexts/TablesContext';
import { useOrder } from '@/contexts/OrderContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tablesService from '@/api/services/tablesService';
import guestsService from '@/api/services/guestsService';
import type { Table, TableStatus, GuestProfile } from '@/types/hospitality';

const STATUSES: TableStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'BLOCKED',
  'DIRTY',
  'CLEANING',
];

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { updateTableStatus } = useTables();
  const { createCheck } = useOrder();
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [guestCountStr, setGuestCountStr] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Guest linking state
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<GuestProfile[]>([]);
  const [searchingGuests, setSearchingGuests] = useState(false);
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [newGuestFirst, setNewGuestFirst] = useState('');
  const [newGuestLast, setNewGuestLast] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [creatingGuest, setCreatingGuest] = useState(false);

  const loadTable = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tablesService.getTable(Number(id));
      setTable(data);
      // Auto-prompt if table is available
      if (data.status === 'AVAILABLE') {
        setShowGuestPrompt(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to load table details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  const handleStatusChange = async (status: TableStatus) => {
    if (!table) return;
    try {
      await updateTableStatus(table.id, status);
      setTable((prev) => (prev ? { ...prev, status } : null));
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleCreateOrder = async () => {
    if (!table || !user) return;
    const count = parseInt(guestCountStr, 10);
    if (isNaN(count) || count < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid guest count');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const check = await createCheck({
        storeId: (user as any).storeId,
        tableId: table.id,
        checkType: 'DINE_IN',
        guestCount: count,
        guestProfileId: selectedGuest?.id,
      });
      setShowGuestPrompt(false);
      await updateTableStatus(table.id, 'OCCUPIED');
      router.replace(`/order/${check.id}` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Guest search with debounce
  useEffect(() => {
    if (guestSearch.length < 2) { setGuestResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingGuests(true);
      try {
        const res = await guestsService.list({ search: guestSearch, limit: 8 });
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray((res as any)?.data?.data) ? (res as any).data.data : [];
        setGuestResults(arr);
      } catch { setGuestResults([]); }
      finally { setSearchingGuests(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [guestSearch]);

  const handleQuickCreateGuest = async () => {
    if (!newGuestFirst.trim()) { Alert.alert('Required', 'First name is required'); return; }
    setCreatingGuest(true);
    try {
      const guest = await guestsService.create({
        firstName: newGuestFirst.trim(),
        lastName: newGuestLast.trim() || undefined,
        phone: newGuestPhone.trim() || undefined,
        email: newGuestEmail.trim() || undefined,
      });
      setSelectedGuest(guest);
      setShowNewGuestForm(false);
      setGuestSearch('');
      setNewGuestFirst(''); setNewGuestLast(''); setNewGuestPhone(''); setNewGuestEmail('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create guest');
    } finally {
      setCreatingGuest(false);
    }
  };

  const resetGuestModal = () => {
    setSelectedGuest(null);
    setGuestSearch('');
    setGuestResults([]);
    setShowNewGuestForm(false);
    setGuestCountStr('');
  };

  const handleViewOrder = () => {
    const checkId = table?.currentCheckId ?? table?.activeCheck?.id;
    if (!checkId) return;
    router.push(`/order/${checkId}` as any);
  };

  const formatElapsed = (openedAt?: string | null) => {
    if (!openedAt) return '--';
    const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}h`;
  };

  const statusStyles: Record<TableStatus, { bg: string; text: string; border: string }> = {
    AVAILABLE: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
    OCCUPIED: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    RESERVED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    BLOCKED: { bg: 'bg-gray-200', text: 'text-gray-600', border: 'border-gray-400' },
    DIRTY: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    CLEANING: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  };

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!table) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Text style={[tw`text-center mt-10 text-gray-500`, typography.body]}>
          Table not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3`, typography.headingSemibold]}>
          {table.name || `Table ${table.tableNumber}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-8`}>
        <View style={tw`bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100`}>
          <Text style={[tw`text-sm text-gray-400 mb-1`, typography.caption]}>
            Status
          </Text>
          <Text style={[tw`text-lg`, typography.headingSemibold]}>
            {table.status}
          </Text>
          <Text style={[tw`text-sm text-gray-500 mt-2`, typography.body]}>
            Capacity: {table.seats} seats
          </Text>
        </View>

        {table.activeCheck && (
          <View style={tw`bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100`}>
            <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
              Active Check
            </Text>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[tw`text-gray-500`, typography.body]}>Order</Text>
              <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                #{table.activeCheck.checkNumber || table.activeCheck.id}
              </Text>
            </View>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[tw`text-gray-500`, typography.body]}>Amount</Text>
              <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                R{table.activeCheck.grandTotal?.toFixed(2) ?? '0.00'}
              </Text>
            </View>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[tw`text-gray-500`, typography.body]}>Guests</Text>
              <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                {table.activeCheck.guestCount}
              </Text>
            </View>
            <View style={tw`flex-row justify-between`}>
              <Text style={[tw`text-gray-500`, typography.body]}>Dining time</Text>
              <Text style={[tw`text-gray-800`, typography.bodySemibold]}>
                {formatElapsed(table.activeCheck.openedAt)}
              </Text>
            </View>
            <TouchableOpacity
              style={tw`bg-indigo-600 rounded-xl py-3.5 items-center mt-5 shadow-sm`}
              onPress={handleViewOrder}
            >
              <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                View Order
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {table.status === 'AVAILABLE' && (
          <TouchableOpacity
            style={tw`bg-blue-600 rounded-xl py-4 items-center mb-4 shadow-sm flex-row justify-center`}
            onPress={() => setShowGuestPrompt(true)}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="white" />
            <Text
              style={[tw`text-white text-base ml-2`, typography.bodySemibold]}
            >
              Open New Order
            </Text>
          </TouchableOpacity>
        )}

        <Text
          style={[
            tw`text-xs text-gray-400 uppercase mb-2 mt-2 ml-1`,
            typography.captionSemibold,
          ]}
        >
          Change Status
        </Text>
        <View style={tw`bg-white rounded-xl p-3 shadow-sm border border-gray-100`}>
          <View style={tw`flex-row flex-wrap`}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={tw`mr-2 mb-2 px-4 py-2.5 rounded-full border ${
                  statusStyles[s].bg
                } ${statusStyles[s].border}`}
                onPress={() => handleStatusChange(s)}
                disabled={table.status === s}
              >
                <View style={tw`flex-row items-center`}>
                  <Text
                    style={[
                      tw`${statusStyles[s].text} ${table.status === s ? 'font-bold' : ''}`,
                      typography.captionSemibold,
                    ]}
                  >
                    {s}
                  </Text>
                  {table.status === s && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={statusStyles[s].text.replace('text-', '')}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Guest Count + Guest Link Modal */}
      <Modal visible={showGuestPrompt} transparent animationType="slide" onRequestClose={() => { setShowGuestPrompt(false); resetGuestModal(); }}>
        <View style={tw`flex-1 bg-black/40 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-[85%]`}>
            <ScrollView contentContainerStyle={tw`p-6 pb-10`} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={tw`flex-row justify-between items-center mb-5`}>
                <Text style={[tw`text-xl text-gray-900`, typography.h2]}>New Order</Text>
                <TouchableOpacity onPress={() => { setShowGuestPrompt(false); resetGuestModal(); }} style={tw`p-1`}>
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Step 1: Guest Count */}
              <Text style={[tw`text-sm text-gray-500 mb-2`, typography.captionSemibold]}>GUESTS</Text>
              <View style={tw`flex-row items-center justify-center mb-6 bg-gray-50 rounded-2xl py-4`}>
                <TouchableOpacity
                  style={tw`w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center`}
                  onPress={() => { const c = parseInt(guestCountStr || '1', 10); if (c > 1) setGuestCountStr((c - 1).toString()); }}
                >
                  <MaterialCommunityIcons name="minus" size={22} color="#374151" />
                </TouchableOpacity>

                <TextInput
                  style={[tw`mx-6 text-center min-w-[50px]`, { fontSize: 28, fontWeight: '700', color: '#111827' }]}
                  keyboardType="numeric"
                  value={guestCountStr}
                  onChangeText={setGuestCountStr}
                  placeholder="1"
                />

                <TouchableOpacity
                  style={tw`w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center`}
                  onPress={() => { const c = parseInt(guestCountStr || '0', 10); setGuestCountStr((c + 1).toString()); }}
                >
                  <MaterialCommunityIcons name="plus" size={22} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={tw`flex-row flex-wrap justify-center gap-2 mb-6`}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={tw`w-11 h-11 rounded-xl ${guestCountStr === num.toString() ? 'bg-blue-600' : 'bg-gray-50 border border-gray-200'} items-center justify-center`}
                    onPress={() => setGuestCountStr(num.toString())}
                  >
                    <Text style={tw`text-base ${guestCountStr === num.toString() ? 'text-white font-bold' : 'text-gray-700'}`}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Step 2: Link Guest (Optional) */}
              <Text style={[tw`text-sm text-gray-500 mb-2`, typography.captionSemibold]}>GUEST PROFILE (OPTIONAL)</Text>

              {selectedGuest ? (
                <View style={tw`bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex-row items-center`}>
                  <View style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3`}>
                    <Text style={tw`text-blue-700 text-base font-bold`}>
                      {(selectedGuest.firstName || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                        {selectedGuest.firstName} {selectedGuest.lastName || ''}
                      </Text>
                      {selectedGuest.isVIP && (
                        <View style={tw`bg-amber-100 rounded px-1.5 py-0.5 ml-2`}>
                          <Text style={tw`text-amber-700 text-[9px] font-bold`}>VIP</Text>
                        </View>
                      )}
                    </View>
                    <Text style={tw`text-gray-500 text-xs`}>
                      {selectedGuest.phone || selectedGuest.email || 'No contact info'}
                      {selectedGuest.totalVisits ? ` · ${selectedGuest.totalVisits} visits` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedGuest(null)} style={tw`p-2`}>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ) : showNewGuestForm ? (
                <View style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-4`}>
                  <View style={tw`flex-row items-center mb-3`}>
                    <MaterialCommunityIcons name="account-plus" size={20} color="#2563EB" />
                    <Text style={[tw`text-gray-900 ml-2`, typography.bodySemibold]}>New Guest</Text>
                    <TouchableOpacity onPress={() => setShowNewGuestForm(false)} style={tw`ml-auto p-1`}>
                      <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={tw`flex-row gap-3 mb-3`}>
                    <TextInput style={tw`flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200`} placeholder="First name *" value={newGuestFirst} onChangeText={setNewGuestFirst} autoFocus />
                    <TextInput style={tw`flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200`} placeholder="Last name" value={newGuestLast} onChangeText={setNewGuestLast} />
                  </View>
                  <TextInput style={tw`bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 mb-3`} placeholder="Phone number" value={newGuestPhone} onChangeText={setNewGuestPhone} keyboardType="phone-pad" />
                  <TextInput style={tw`bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 mb-3`} placeholder="Email (optional)" value={newGuestEmail} onChangeText={setNewGuestEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TouchableOpacity
                    style={tw`bg-blue-600 rounded-xl py-3 items-center ${creatingGuest ? 'opacity-70' : ''}`}
                    onPress={handleQuickCreateGuest}
                    disabled={creatingGuest}
                  >
                    {creatingGuest ? <ActivityIndicator color="white" size="small" /> : (
                      <Text style={tw`text-white font-semibold`}>Save & Link Guest</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={tw`mb-4`}>
                  <View style={tw`flex-row items-center bg-gray-50 rounded-xl px-3 border border-gray-200`}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                    <TextInput
                      style={tw`flex-1 py-2.5 ml-2 text-gray-900`}
                      placeholder="Search by name or phone..."
                      placeholderTextColor="#9CA3AF"
                      value={guestSearch}
                      onChangeText={setGuestSearch}
                    />
                    {searchingGuests && <ActivityIndicator size="small" color="#3B82F6" />}
                    {guestSearch.length > 0 && !searchingGuests && (
                      <TouchableOpacity onPress={() => { setGuestSearch(''); setGuestResults([]); }}>
                        <MaterialCommunityIcons name="close" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Search Results */}
                  {guestSearch.length >= 2 && guestResults.length > 0 && (
                    <View style={tw`mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden`}>
                      {guestResults.slice(0, 5).map((g) => (
                        <TouchableOpacity
                          key={g.id}
                          style={tw`flex-row items-center px-3 py-3 border-b border-gray-50`}
                          onPress={() => { setSelectedGuest(g); setGuestSearch(''); setGuestResults([]); }}
                        >
                          <View style={tw`w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-3`}>
                            <Text style={tw`text-blue-600 text-sm font-bold`}>{(g.firstName || '?')[0].toUpperCase()}</Text>
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-900 text-sm font-semibold`}>{g.firstName} {g.lastName || ''}</Text>
                            <Text style={tw`text-gray-400 text-xs`}>{g.phone || g.email || ''}</Text>
                          </View>
                          {g.isVIP && (
                            <View style={tw`bg-amber-100 rounded px-1.5 py-0.5`}>
                              <Text style={tw`text-amber-700 text-[9px] font-bold`}>VIP</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* No results + create option */}
                  {guestSearch.length >= 2 && !searchingGuests && guestResults.length === 0 && (
                    <View style={tw`mt-2 bg-gray-50 rounded-xl p-4 items-center`}>
                      <Text style={tw`text-gray-500 text-sm mb-2`}>No guests found</Text>
                      <TouchableOpacity
                        style={tw`flex-row items-center bg-blue-600 rounded-xl px-4 py-2.5`}
                        onPress={() => { setShowNewGuestForm(true); setNewGuestFirst(guestSearch); }}
                      >
                        <MaterialCommunityIcons name="account-plus" size={18} color="white" />
                        <Text style={tw`text-white font-semibold ml-2`}>Create "{guestSearch}"</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Skip link */}
                  {guestSearch.length === 0 && (
                    <TouchableOpacity
                      style={tw`flex-row items-center justify-center mt-3`}
                      onPress={() => setShowNewGuestForm(true)}
                    >
                      <MaterialCommunityIcons name="account-plus-outline" size={16} color="#3B82F6" />
                      <Text style={tw`text-blue-600 text-sm ml-1.5`}>Create new guest</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Create Order Button */}
              <TouchableOpacity
                style={tw`bg-blue-600 rounded-2xl py-4 items-center shadow-sm ${isCreatingOrder ? 'opacity-70' : ''}`}
                onPress={handleCreateOrder}
                disabled={isCreatingOrder}
              >
                {isCreatingOrder ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                    {selectedGuest ? `Open Order for ${selectedGuest.firstName}` : 'Open Order'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
