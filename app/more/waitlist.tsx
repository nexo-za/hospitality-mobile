import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useReservations } from '@/contexts/ReservationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/api/api';
import type { WaitlistEntry, WaitlistStatus, EstimatedWait } from '@/types/hospitality';

const WAITLIST_STATUS_STYLES: Record<WaitlistStatus, { bg: string; text: string; label: string }> = {
  WAITING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Waiting' },
  NOTIFIED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Notified' },
  SEATED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Seated' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
  NO_SHOW: { bg: 'bg-red-100', text: 'text-red-700', label: 'No Show' },
};

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function WaitlistScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    waitlist,
    isLoading,
    loadWaitlist,
    addToWaitlist,
    getEstimatedWait,
  } = useReservations();

  const storeId = (user as any)?.storeId as number | undefined;

  const [showForm, setShowForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [quotedWaitTime, setQuotedWaitTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<EstimatedWait | null>(null);

  const waitingCount = useMemo(
    () => waitlist.filter((e) => e.status === 'WAITING' || e.status === 'NOTIFIED').length,
    [waitlist],
  );

  const refresh = useCallback(() => {
    if (storeId) loadWaitlist(storeId);
  }, [storeId, loadWaitlist]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (storeId) {
      getEstimatedWait(storeId, 2)
        .then(setEstimatedWait)
        .catch(() => {});
    }
  }, [storeId, getEstimatedWait, waitlist.length]);

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setPartySize(2);
    setNotes('');
    setQuotedWaitTime('');
  };

  const handleSubmit = async () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Guest name is required.');
      return;
    }
    if (!storeId) return;

    setSubmitting(true);
    try {
      await addToWaitlist({
        storeId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        partySize,
        notes: notes.trim() || undefined,
        quotedWaitTime: quotedWaitTime ? Number(quotedWaitTime) : undefined,
      });
      resetForm();
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add to waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotify = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/hospitality/waitlist/${id}/notify`);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to notify guest');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeat = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/hospitality/waitlist/${id}/seat`);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to seat guest');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = (id: number, guestName: string) => {
    Alert.alert('Remove Guest', `Remove ${guestName} from the waitlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            await api.delete(`/hospitality/waitlist/${id}`);
            refresh();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Failed to remove');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const renderEntry = ({ item }: { item: WaitlistEntry }) => {
    const style = WAITLIST_STATUS_STYLES[item.status];
    const elapsed = getElapsedMinutes(item.createdAt);
    const isActive = item.status === 'WAITING' || item.status === 'NOTIFIED';
    const loading = actionLoading === item.id;

    return (
      <View style={tw`bg-white rounded-xl p-4 mb-3 mx-4 border border-gray-100`}>
        <View style={tw`flex-row items-center`}>
          {item.position != null && (
            <View style={tw`bg-blue-600 rounded-full w-9 h-9 items-center justify-center mr-3`}>
              <Text style={[tw`text-white text-sm`, typography.bodySemibold]}>
                {item.position}
              </Text>
            </View>
          )}
          <View style={tw`flex-1`}>
            <Text style={[tw`text-base`, typography.bodySemibold]}>
              {item.guestName}
            </Text>
            <View style={tw`flex-row items-center mt-1`}>
              <MaterialCommunityIcons name="account-multiple" size={14} color="#6B7280" />
              <Text style={[tw`text-sm text-gray-500 ml-1`, typography.caption]}>
                Party of {item.partySize}
              </Text>
              {item.guestPhone ? (
                <>
                  <Text style={tw`text-gray-300 mx-2`}>|</Text>
                  <MaterialCommunityIcons name="phone-outline" size={13} color="#6B7280" />
                  <Text style={[tw`text-sm text-gray-500 ml-1`, typography.caption]}>
                    {item.guestPhone}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={tw`${style.bg} rounded-full px-2.5 py-1`}>
            <Text style={[tw`text-xs ${style.text}`, typography.captionSemibold]}>
              {style.label}
            </Text>
          </View>
        </View>

        <View style={tw`flex-row items-center mt-3`}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
          <Text style={[tw`text-sm text-gray-500 ml-1`, typography.caption]}>
            {elapsed} min elapsed
          </Text>
          {item.quotedWaitTime != null && (
            <Text style={[tw`text-sm text-gray-400 ml-1`, typography.caption]}>
              (quoted ~{item.quotedWaitTime} min)
            </Text>
          )}
        </View>

        {item.notes ? (
          <Text style={[tw`text-xs text-gray-400 mt-1.5 italic`, typography.small]}>
            {item.notes}
          </Text>
        ) : null}

        {isActive && (
          <View style={tw`flex-row mt-3 gap-2`}>
            {item.status === 'WAITING' && (
              <TouchableOpacity
                style={tw`flex-1 bg-blue-500 rounded-lg py-2 items-center`}
                onPress={() => handleNotify(item.id)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[tw`text-white text-sm`, typography.captionSemibold]}>Notify</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={tw`flex-1 bg-green-500 rounded-lg py-2 items-center`}
              onPress={() => handleSeat(item.id)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[tw`text-white text-sm`, typography.captionSemibold]}>Seat</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 bg-red-50 border border-red-200 rounded-lg py-2 items-center`}
              onPress={() => handleRemove(item.id, item.guestName)}
              disabled={loading}
            >
              <Text style={[tw`text-red-600 text-sm`, typography.captionSemibold]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={[tw`text-lg ml-3`, typography.h3]}>Waitlist</Text>
          {waitingCount > 0 && (
            <View style={tw`bg-yellow-500 rounded-full min-w-6 h-6 items-center justify-center ml-2 px-1.5`}>
              <Text style={[tw`text-white text-xs`, typography.smallMedium]}>
                {waitingCount}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={tw`bg-blue-600 rounded-lg px-3 py-2 flex-row items-center`}
          onPress={() => setShowForm(true)}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={[tw`text-white text-sm ml-1`, typography.captionSemibold]}>Add Guest</Text>
        </TouchableOpacity>
      </View>

      {/* Estimated wait banner */}
      {estimatedWait && (
        <View style={tw`mx-4 mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex-row items-center`}>
          <MaterialCommunityIcons name="timer-sand" size={20} color="#2563EB" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-sm text-blue-800`, typography.captionSemibold]}>
              Est. wait: ~{estimatedWait.estimatedMinutes} min
            </Text>
            <Text style={[tw`text-xs text-blue-600`, typography.small]}>
              {estimatedWait.partiesAhead} {estimatedWait.partiesAhead === 1 ? 'party' : 'parties'} ahead
            </Text>
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={waitlist}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderEntry}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
        contentContainerStyle={tw`pb-8 pt-3`}
        ListEmptyComponent={
          !isLoading ? (
            <View style={tw`items-center py-20`}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={56} color="#D1D5DB" />
              <Text style={[tw`text-gray-400 mt-4`, typography.body]}>
                No one on the waitlist
              </Text>
              <Text style={[tw`text-gray-300 mt-1`, typography.caption]}>
                Tap "Add Guest" to get started
              </Text>
            </View>
          ) : null
        }
      />

      {/* Add-to-waitlist modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw`flex-1 justify-end`}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={tw`flex-1`}
            onPress={() => setShowForm(false)}
          />
          <View style={tw`bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-lg`}>
            <View style={tw`flex-row items-center justify-between mb-5`}>
              <Text style={[tw`text-lg`, typography.h3]}>Add to Waitlist</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Guest Name *
            </Text>
            <TextInput
              style={[tw`border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-base`, typography.body]}
              placeholder="Enter guest name"
              value={guestName}
              onChangeText={setGuestName}
              autoFocus
            />

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Phone
            </Text>
            <TextInput
              style={[tw`border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-base`, typography.body]}
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Party Size
            </Text>
            <View style={tw`flex-row items-center mb-3`}>
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-lg border border-gray-200 items-center justify-center`}
                onPress={() => setPartySize((p) => Math.max(1, p - 1))}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={[tw`mx-5 text-lg`, typography.bodySemibold]}>{partySize}</Text>
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-lg border border-gray-200 items-center justify-center`}
                onPress={() => setPartySize((p) => Math.min(20, p + 1))}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Quoted Wait (minutes)
            </Text>
            <TextInput
              style={[tw`border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-base`, typography.body]}
              placeholder="e.g. 15"
              keyboardType="numeric"
              value={quotedWaitTime}
              onChangeText={setQuotedWaitTime}
            />

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Notes
            </Text>
            <TextInput
              style={[
                tw`border border-gray-200 rounded-lg px-3 py-2.5 mb-4 text-base`,
                typography.body,
                { minHeight: 60, textAlignVertical: 'top' },
              ]}
              placeholder="Any notes..."
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={tw`bg-blue-600 rounded-xl py-3.5 items-center ${submitting ? 'opacity-60' : ''}`}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                  Add to Waitlist
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
