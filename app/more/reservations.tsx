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
  SectionList,
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
import type { Reservation, ReservationStatus } from '@/types/hospitality';

type Tab = 'today' | 'upcoming';

const STATUS_STYLES: Record<ReservationStatus, { bg: string; text: string; label: string }> = {
  RESERVATION_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed' },
  SEATED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Seated' },
  RESERVATION_COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Completed' },
  NO_SHOW: { bg: 'bg-red-100', text: 'text-red-700', label: 'No Show' },
  RESERVATION_CANCELLED: { bg: 'bg-red-50', text: 'text-red-500', label: 'Cancelled' },
};

function formatTime(dateTime: string): string {
  return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getHourLabel(dateTime: string): string {
  const d = new Date(dateTime);
  const h = d.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:00 ${suffix}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TimelineSection {
  title: string;
  sortKey: number;
  data: Reservation[];
}

function groupByHour(reservations: Reservation[]): TimelineSection[] {
  const map = new Map<string, Reservation[]>();

  const sorted = [...reservations].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  );

  for (const r of sorted) {
    const label = getHourLabel(r.dateTime);
    const existing = map.get(label);
    if (existing) {
      existing.push(r);
    } else {
      map.set(label, [r]);
    }
  }

  return Array.from(map.entries()).map(([title, data]) => ({
    title,
    sortKey: new Date(data[0].dateTime).getHours(),
    data,
  }));
}

export default function ReservationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    todayReservations,
    reservations,
    isLoading,
    loadTodayReservations,
    loadReservations,
    createReservation,
    confirmReservation,
    seatReservation,
    cancelReservation,
    noShowReservation,
  } = useReservations();

  const storeId = (user as any)?.storeId as number | undefined;

  const [tab, setTab] = useState<Tab>('today');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPartySize, setWalkInPartySize] = useState(2);
  const [walkInNotes, setWalkInNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const refreshToday = useCallback(() => {
    if (storeId) loadTodayReservations(storeId);
  }, [storeId, loadTodayReservations]);

  const refreshUpcoming = useCallback(() => {
    if (storeId) loadReservations({ storeId, dateFrom: todayISO() });
  }, [storeId, loadReservations]);

  const refresh = useCallback(() => {
    if (tab === 'today') refreshToday();
    else refreshUpcoming();
  }, [tab, refreshToday, refreshUpcoming]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeData = tab === 'today' ? todayReservations : reservations;

  const sections = useMemo(() => groupByHour(activeData), [activeData]);

  const resetWalkIn = () => {
    setWalkInName('');
    setWalkInPartySize(2);
    setWalkInNotes('');
  };

  const handleWalkInSubmit = async () => {
    if (!walkInName.trim()) {
      Alert.alert('Required', 'Guest name is required.');
      return;
    }
    if (!storeId) return;

    setSubmitting(true);
    try {
      await createReservation({
        storeId,
        guestName: walkInName.trim(),
        partySize: walkInPartySize,
        dateTime: new Date().toISOString(),
        source: 'WALK_IN',
        notes: walkInNotes.trim() || undefined,
      });
      resetWalkIn();
      setShowWalkIn(false);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create walk-in');
    } finally {
      setSubmitting(false);
    }
  };

  const withAction = async (id: number, fn: () => Promise<void>) => {
    setActionLoading(id);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = (id: number) => withAction(id, () => confirmReservation(id));
  const handleSeat = (id: number) => withAction(id, () => seatReservation(id));
  const handleNoShow = (id: number) => withAction(id, () => noShowReservation(id));

  const handleComplete = (id: number) =>
    withAction(id, async () => {
      await api.post(`/hospitality/reservations/${id}/complete`);
      refresh();
    });

  const handleCancel = (id: number, name: string) => {
    Alert.alert(
      'Cancel Reservation',
      `Cancel ${name}'s reservation?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: () => withAction(id, () => cancelReservation(id)),
        },
      ],
    );
  };

  const renderCard = ({ item: res }: { item: Reservation }) => {
    const badge = STATUS_STYLES[res.status] ?? STATUS_STYLES.RESERVATION_PENDING;
    const loading = actionLoading === res.id;

    return (
      <View style={tw`bg-white rounded-xl p-4 mb-3 mx-4 border border-gray-100`}>
        {/* Top row */}
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={tw`flex-1 flex-row items-center`}>
            <Text style={[tw`text-base`, typography.bodySemibold]}>{res.guestName}</Text>
            {res.source === 'WALK_IN' && (
              <View style={tw`bg-orange-100 rounded-full px-2 py-0.5 ml-2`}>
                <Text style={[tw`text-xs text-orange-600`, typography.smallMedium]}>Walk-in</Text>
              </View>
            )}
          </View>
          <View style={tw`${badge.bg} rounded-full px-2.5 py-1`}>
            <Text style={[tw`text-xs ${badge.text}`, typography.captionSemibold]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Details row */}
        <View style={tw`flex-row items-center flex-wrap`}>
          <MaterialCommunityIcons name="account-multiple" size={14} color="#6B7280" />
          <Text style={[tw`text-sm text-gray-500 ml-1 mr-4`, typography.caption]}>
            {res.partySize} {res.partySize === 1 ? 'guest' : 'guests'}
          </Text>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
          <Text style={[tw`text-sm text-gray-500 ml-1`, typography.caption]}>
            {formatTime(res.dateTime)}
          </Text>
          {res.tableName ? (
            <>
              <Text style={tw`text-gray-300 mx-2`}>|</Text>
              <MaterialCommunityIcons name="table-furniture" size={14} color="#6B7280" />
              <Text style={[tw`text-sm text-gray-500 ml-1`, typography.caption]}>
                {res.tableName}
              </Text>
            </>
          ) : null}
        </View>

        {/* Notes / special requests */}
        {(res.specialRequests || res.notes) && (
          <Text style={[tw`text-xs text-gray-400 mt-2 italic`, typography.small]}>
            {res.specialRequests || res.notes}
          </Text>
        )}

        {/* Action buttons */}
        {renderActions(res, loading)}
      </View>
    );
  };

  const renderActions = (res: Reservation, loading: boolean) => {
    const isPending = res.status === 'RESERVATION_PENDING';
    const isConfirmed = res.status === 'CONFIRMED';
    const isSeated = res.status === 'SEATED';

    if (!isPending && !isConfirmed && !isSeated) return null;

    return (
      <View style={tw`flex-row mt-3 gap-2 flex-wrap`}>
        {isPending && (
          <TouchableOpacity
            style={tw`flex-1 bg-blue-500 rounded-lg py-2 items-center min-w-20`}
            onPress={() => handleConfirm(res.id)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[tw`text-white text-sm`, typography.captionSemibold]}>Confirm</Text>
            )}
          </TouchableOpacity>
        )}

        {(isPending || isConfirmed) && (
          <>
            <TouchableOpacity
              style={tw`flex-1 bg-green-500 rounded-lg py-2 items-center min-w-16`}
              onPress={() => handleSeat(res.id)}
              disabled={loading}
            >
              <Text style={[tw`text-white text-sm`, typography.captionSemibold]}>Seat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`flex-1 bg-amber-50 border border-amber-200 rounded-lg py-2 items-center min-w-20`}
              onPress={() => handleNoShow(res.id)}
              disabled={loading}
            >
              <Text style={[tw`text-amber-700 text-sm`, typography.captionSemibold]}>No Show</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`flex-1 bg-red-50 border border-red-200 rounded-lg py-2 items-center min-w-16`}
              onPress={() => handleCancel(res.id, res.guestName)}
              disabled={loading}
            >
              <Text style={[tw`text-red-600 text-sm`, typography.captionSemibold]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {isSeated && (
          <TouchableOpacity
            style={tw`flex-1 bg-gray-800 rounded-lg py-2 items-center`}
            onPress={() => handleComplete(res.id)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[tw`text-white text-sm`, typography.captionSemibold]}>Complete</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: TimelineSection }) => (
    <View style={tw`flex-row items-center px-4 pt-4 pb-1`}>
      <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2`} />
      <Text style={[tw`text-sm text-gray-500`, typography.captionSemibold]}>
        {section.title}
      </Text>
      <View style={tw`flex-1 h-px bg-gray-200 ml-3`} />
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3 flex-1`, typography.h3]}>Reservations</Text>
      </View>

      {/* Tab switcher */}
      <View style={tw`flex-row mx-4 mt-3 bg-gray-200 rounded-xl p-1`}>
        {(['today', 'upcoming'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={tw`flex-1 py-2 rounded-lg items-center ${tab === t ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab(t)}
          >
            <Text
              style={[
                tw`text-sm ${tab === t ? 'text-gray-900' : 'text-gray-500'}`,
                tab === t ? typography.captionSemibold : typography.caption,
              ]}
            >
              {t === 'today' ? 'Today' : 'Upcoming'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeline list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
        contentContainerStyle={tw`pb-24 pt-1`}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={tw`items-center py-20`}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={56} color="#D1D5DB" />
              <Text style={[tw`text-gray-400 mt-4`, typography.body]}>
                {tab === 'today' ? 'No reservations today' : 'No upcoming reservations'}
              </Text>
              <Text style={[tw`text-gray-300 mt-1`, typography.caption]}>
                Tap the walk-in button to add one
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating walk-in button */}
      <TouchableOpacity
        style={tw`absolute bottom-6 right-5 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg`}
        onPress={() => setShowWalkIn(true)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="walk" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Walk-in modal */}
      <Modal visible={showWalkIn} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw`flex-1 justify-end`}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={tw`flex-1`}
            onPress={() => setShowWalkIn(false)}
          />
          <View style={tw`bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-lg`}>
            <View style={tw`flex-row items-center justify-between mb-5`}>
              <Text style={[tw`text-lg`, typography.h3]}>Quick Walk-in</Text>
              <TouchableOpacity onPress={() => setShowWalkIn(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Guest Name *
            </Text>
            <TextInput
              style={[tw`border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-base`, typography.body]}
              placeholder="Enter guest name"
              value={walkInName}
              onChangeText={setWalkInName}
              autoFocus
            />

            <Text style={[tw`text-sm text-gray-600 mb-1`, typography.captionSemibold]}>
              Party Size
            </Text>
            <View style={tw`flex-row items-center mb-3`}>
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-lg border border-gray-200 items-center justify-center`}
                onPress={() => setWalkInPartySize((p) => Math.max(1, p - 1))}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={[tw`mx-5 text-lg`, typography.bodySemibold]}>{walkInPartySize}</Text>
              <TouchableOpacity
                style={tw`w-10 h-10 rounded-lg border border-gray-200 items-center justify-center`}
                onPress={() => setWalkInPartySize((p) => Math.min(20, p + 1))}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

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
              value={walkInNotes}
              onChangeText={setWalkInNotes}
            />

            <TouchableOpacity
              style={tw`bg-blue-600 rounded-xl py-3.5 items-center ${submitting ? 'opacity-60' : ''}`}
              onPress={handleWalkInSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                  Seat Walk-in
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
