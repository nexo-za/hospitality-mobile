import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import guestsService from '@/api/services/guestsService';
import type { Table, GuestProfile } from '@/types/hospitality';

interface NewOrderSheetProps {
  visible: boolean;
  table: Table | null;
  onClose: () => void;
  onCreateOrder: (guestCount: number, guestProfileId?: number) => Promise<void>;
}

export function NewOrderSheet({ visible, table, onClose, onCreateOrder }: NewOrderSheetProps) {
  const [guestCountStr, setGuestCountStr] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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

  const reset = useCallback(() => {
    setGuestCountStr('');
    setSelectedGuest(null);
    setGuestSearch('');
    setGuestResults([]);
    setShowNewGuestForm(false);
    setNewGuestFirst('');
    setNewGuestLast('');
    setNewGuestPhone('');
    setNewGuestEmail('');
    setIsCreating(false);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  useEffect(() => {
    if (guestSearch.length < 2) {
      setGuestResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingGuests(true);
      try {
        const res = await guestsService.list({ search: guestSearch, limit: 8 });
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : [];
        setGuestResults(arr);
      } catch {
        setGuestResults([]);
      } finally {
        setSearchingGuests(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [guestSearch]);

  const handleQuickCreateGuest = async () => {
    if (!newGuestFirst.trim()) {
      Alert.alert('Required', 'First name is required');
      return;
    }
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
      setNewGuestFirst('');
      setNewGuestLast('');
      setNewGuestPhone('');
      setNewGuestEmail('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create guest');
    } finally {
      setCreatingGuest(false);
    }
  };

  const handleCreateOrder = async () => {
    const count = parseInt(guestCountStr, 10);
    if (isNaN(count) || count < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid guest count');
      return;
    }
    setIsCreating(true);
    try {
      await onCreateOrder(count, selectedGuest?.id);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order');
    } finally {
      setIsCreating(false);
    }
  };

  if (!table) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 bg-black/40`} onPress={onClose}>
        <View style={tw`flex-1`} />
        <Pressable style={tw`bg-white rounded-t-3xl max-h-[85%]`} onPress={() => {}}>
          <View style={tw`items-center pt-3 pb-1`}>
            <View style={tw`w-10 h-1 rounded-full bg-gray-300`} />
          </View>

          <ScrollView contentContainerStyle={tw`p-6 pb-10`} keyboardShouldPersistTaps="handled">
            <View style={tw`flex-row justify-between items-center mb-1`}>
              <Text style={[tw`text-xl text-gray-900`, typography.h2]}>New Order</Text>
              <TouchableOpacity onPress={onClose} style={tw`p-1`}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={[tw`text-sm text-gray-400 mb-5`, typography.body]}>
              {table.name || `Table ${table.tableNumber}`} · {table.seats} seats
            </Text>

            {/* Guest Count */}
            <Text style={[tw`text-sm text-gray-500 mb-2`, typography.captionSemibold]}>GUESTS</Text>
            <View style={tw`flex-row items-center justify-center mb-4 bg-gray-50 rounded-2xl py-4`}>
              <TouchableOpacity
                style={tw`w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center`}
                onPress={() => {
                  const c = parseInt(guestCountStr || '1', 10);
                  if (c > 1) setGuestCountStr((c - 1).toString());
                }}
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
                onPress={() => {
                  const c = parseInt(guestCountStr || '0', 10);
                  setGuestCountStr((c + 1).toString());
                }}
              >
                <MaterialCommunityIcons name="plus" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={tw`flex-row flex-wrap justify-center gap-2 mb-6`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={tw`w-11 h-11 rounded-xl ${guestCountStr === num.toString() ? 'bg-blue-600' : 'bg-gray-50 border border-gray-200'} items-center justify-center`}
                  onPress={() => setGuestCountStr(num.toString())}
                >
                  <Text style={tw`text-base ${guestCountStr === num.toString() ? 'text-white font-bold' : 'text-gray-700'}`}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Guest Profile */}
            <Text style={[tw`text-sm text-gray-500 mb-2`, typography.captionSemibold]}>
              GUEST PROFILE (OPTIONAL)
            </Text>

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
                  <TextInput
                    style={tw`flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200`}
                    placeholder="First name *"
                    value={newGuestFirst}
                    onChangeText={setNewGuestFirst}
                    autoFocus
                  />
                  <TextInput
                    style={tw`flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200`}
                    placeholder="Last name"
                    value={newGuestLast}
                    onChangeText={setNewGuestLast}
                  />
                </View>
                <TextInput
                  style={tw`bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 mb-3`}
                  placeholder="Phone number"
                  value={newGuestPhone}
                  onChangeText={setNewGuestPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={tw`bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 mb-3`}
                  placeholder="Email (optional)"
                  value={newGuestEmail}
                  onChangeText={setNewGuestEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={tw`bg-blue-600 rounded-xl py-3 items-center ${creatingGuest ? 'opacity-70' : ''}`}
                  onPress={handleQuickCreateGuest}
                  disabled={creatingGuest}
                >
                  {creatingGuest ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
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

                {guestSearch.length >= 2 && guestResults.length > 0 && (
                  <View style={tw`mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden`}>
                    {guestResults.slice(0, 5).map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={tw`flex-row items-center px-3 py-3 border-b border-gray-50`}
                        onPress={() => { setSelectedGuest(g); setGuestSearch(''); setGuestResults([]); }}
                      >
                        <View style={tw`w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-3`}>
                          <Text style={tw`text-blue-600 text-sm font-bold`}>
                            {(g.firstName || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-gray-900 text-sm font-semibold`}>
                            {g.firstName} {g.lastName || ''}
                          </Text>
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

                {guestSearch.length >= 2 && !searchingGuests && guestResults.length === 0 && (
                  <View style={tw`mt-2 bg-gray-50 rounded-xl p-4 items-center`}>
                    <Text style={tw`text-gray-500 text-sm mb-2`}>No guests found</Text>
                    <TouchableOpacity
                      style={tw`flex-row items-center bg-blue-600 rounded-xl px-4 py-2.5`}
                      onPress={() => { setShowNewGuestForm(true); setNewGuestFirst(guestSearch); }}
                    >
                      <MaterialCommunityIcons name="account-plus" size={18} color="white" />
                      <Text style={tw`text-white font-semibold ml-2`}>Create &quot;{guestSearch}&quot;</Text>
                    </TouchableOpacity>
                  </View>
                )}

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
              style={tw`bg-blue-600 rounded-2xl py-4 items-center shadow-sm ${isCreating ? 'opacity-70' : ''}`}
              onPress={handleCreateOrder}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                  {selectedGuest ? `Open Order for ${selectedGuest.firstName}` : 'Open Order'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
