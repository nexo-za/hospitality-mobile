import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import kdsService from '@/api/services/kdsService';
import type {
  KDSStation,
  KDSTicket,
  KDSTicketItem,
  KDSTicketStatus,
} from '@/types/hospitality';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TICKET_CARD_WIDTH = SCREEN_WIDTH * 0.75;
const AUTO_REFRESH_MS = 10_000;

type ItemStatus = KDSTicketItem['status'];

const ITEM_STATUS_CYCLE: Record<ItemStatus, ItemStatus> = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'READY',
  READY: 'PENDING',
};

const ITEM_DOT_COLOR: Record<ItemStatus, string> = {
  PENDING: '#9CA3AF',
  IN_PROGRESS: '#3B82F6',
  READY: '#22C55E',
};

function getTicketAge(ticket: KDSTicket): number {
  if (ticket.elapsedSeconds != null) return ticket.elapsedSeconds;
  return Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 1000);
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getAgeColors(seconds: number) {
  if (seconds >= 600) return { border: '#EF4444', bg: '#FEF2F2', text: '#991B1B' };
  if (seconds >= 300) return { border: '#F59E0B', bg: '#FFFBEB', text: '#92400E' };
  return { border: '#22C55E', bg: '#F0FDF4', text: '#166534' };
}

function statusActions(status: KDSTicketStatus) {
  switch (status) {
    case 'NEW':
      return [{ label: 'Start', action: 'start' as const, color: '#3B82F6' }];
    case 'IN_PROGRESS':
      return [{ label: 'Ready', action: 'ready' as const, color: '#F59E0B' }];
    case 'READY':
      return [{ label: 'Bump', action: 'bump' as const, color: '#22C55E' }];
    case 'BUMPED':
      return [{ label: 'Recall', action: 'recall' as const, color: '#8B5CF6' }];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Timer hook – drives per-second updates for all visible tickets
// ---------------------------------------------------------------------------
function useTicketTimers(tickets: KDSTicket[]) {
  const [elapsed, setElapsed] = useState<Record<number, number>>({});
  const baseRef = useRef<Record<number, { base: number; ts: number }>>({});

  useEffect(() => {
    const bases: Record<number, { base: number; ts: number }> = {};
    const initial: Record<number, number> = {};
    const now = Date.now();

    tickets.forEach((t) => {
      const age = getTicketAge(t);
      bases[t.id] = { base: age, ts: now };
      initial[t.id] = age;
    });

    baseRef.current = bases;
    setElapsed(initial);

    const iv = setInterval(() => {
      const n = Date.now();
      setElapsed((prev) => {
        const next: Record<number, number> = {};
        for (const id of Object.keys(baseRef.current)) {
          const nid = Number(id);
          const b = baseRef.current[nid];
          next[nid] = b.base + Math.floor((n - b.ts) / 1000);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(iv);
  }, [tickets]);

  return elapsed;
}

// ---------------------------------------------------------------------------
// Ticket Card
// ---------------------------------------------------------------------------
interface TicketCardProps {
  ticket: KDSTicket;
  seconds: number;
  onAction: (ticketId: number, action: string) => void;
  onItemTap: (item: KDSTicketItem) => void;
  onTogglePriority: (ticket: KDSTicket) => void;
}

function TicketCard({ ticket, seconds, onAction, onItemTap, onTogglePriority }: TicketCardProps) {
  const colors = getAgeColors(seconds);
  const actions = statusActions(ticket.status);
  const isHighPriority = ticket.priority > 1;

  return (
    <View
      style={[
        tw`rounded-xl mr-3 overflow-hidden`,
        {
          width: TICKET_CARD_WIDTH,
          borderWidth: 2,
          borderColor: colors.border,
          backgroundColor: colors.bg,
        },
      ]}
    >
      {/* Header */}
      <View style={[tw`px-3 pt-3 pb-2`, { backgroundColor: colors.border + '18' }]}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center flex-1`}>
            <Text style={[tw`text-base`, typography.headingSemibold, { color: colors.text }]}>
              #{ticket.checkNumber}
            </Text>
            {isHighPriority && (
              <View style={tw`ml-2 bg-red-500 rounded-full px-2 py-0.5`}>
                <Text style={[tw`text-white text-xs`, typography.captionSemibold]}>RUSH</Text>
              </View>
            )}
            {ticket.courseNumber != null && (
              <View style={tw`ml-2 bg-indigo-500 rounded-full px-2 py-0.5`}>
                <Text style={[tw`text-white text-xs`, typography.captionSemibold]}>
                  C{ticket.courseNumber}
                </Text>
              </View>
            )}
          </View>
          <View style={tw`bg-white rounded-lg px-2 py-1`}>
            <Text style={[tw`text-sm`, typography.headingSemibold, { color: colors.text }]}>
              {formatTimer(seconds)}
            </Text>
          </View>
        </View>

        <View style={tw`flex-row items-center mt-1`}>
          {ticket.tableName ? (
            <View style={tw`flex-row items-center mr-3`}>
              <MaterialCommunityIcons name="table-furniture" size={14} color={colors.text} />
              <Text style={[tw`text-xs ml-1`, typography.caption, { color: colors.text }]}>
                {ticket.tableName}
              </Text>
            </View>
          ) : null}
          {ticket.serverName ? (
            <View style={tw`flex-row items-center`}>
              <MaterialCommunityIcons name="account" size={14} color={colors.text} />
              <Text style={[tw`text-xs ml-1`, typography.caption, { color: colors.text }]}>
                {ticket.serverName}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Items */}
      <View style={tw`px-3 py-2`}>
        {ticket.items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={tw`flex-row items-start py-1.5 border-b border-gray-100`}
            onPress={() => onItemTap(item)}
            activeOpacity={0.6}
          >
            <View
              style={[
                tw`rounded-full mt-1 mr-2`,
                { width: 10, height: 10, backgroundColor: ITEM_DOT_COLOR[item.status] },
              ]}
            />
            <View style={tw`flex-1`}>
              <Text style={[tw`text-sm`, typography.bodySemibold]}>
                {item.quantity}x {item.menuItemName}
              </Text>
              {item.modifiers && item.modifiers.length > 0 && (
                <Text style={[tw`text-xs text-gray-500`, typography.caption]}>
                  {item.modifiers.join(', ')}
                </Text>
              )}
              {item.specialRequests ? (
                <Text style={[tw`text-xs text-orange-600 mt-0.5`, typography.captionSemibold]}>
                  ⚠ {item.specialRequests}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={tw`flex-row px-3 pb-3 pt-1`}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.action}
            style={[tw`flex-1 rounded-lg py-2.5 items-center mr-1`, { backgroundColor: a.color }]}
            onPress={() => onAction(ticket.id, a.action)}
          >
            <Text style={[tw`text-white text-sm`, typography.bodySemibold]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            tw`rounded-lg py-2.5 px-3 items-center`,
            { backgroundColor: isHighPriority ? '#EF4444' : '#6B7280' },
          ]}
          onPress={() => onTogglePriority(ticket)}
        >
          <MaterialCommunityIcons name="flag" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function KDSScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stations, setStations] = useState<KDSStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<KDSStation | null>(null);
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed = useTicketTimers(tickets);

  const activeCount = useCallback(
    (stationId: number) =>
      tickets.filter(
        (t) => t.stationId === stationId && t.status !== 'BUMPED',
      ).length,
    [tickets],
  );

  // ---- Data Loading ----

  const loadTickets = useCallback(async (stationId: number) => {
    try {
      const res = await kdsService.listTickets(stationId, { limit: 50 });
      setTickets(res.data);
    } catch {
      setTickets([]);
    }
  }, []);

  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kdsService.listStations({
        storeId: (user as any)?.storeId,
        isActive: true,
      });
      setStations(res.data);
      if (res.data.length > 0) {
        const first = res.data[0];
        setSelectedStation((prev) => prev ?? first);
        await loadTickets((selectedStation ?? first).id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, selectedStation, loadTickets]);

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (!selectedStation) return;
    autoRefreshRef.current = setInterval(() => loadTickets(selectedStation.id), AUTO_REFRESH_MS);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [selectedStation, loadTickets]);

  // ---- Handlers ----

  const refresh = useCallback(async () => {
    if (selectedStation) {
      setLoading(true);
      await loadTickets(selectedStation.id);
      setLoading(false);
    } else {
      await loadStations();
    }
  }, [selectedStation, loadTickets, loadStations]);

  const handleTicketAction = useCallback(
    async (ticketId: number, action: string) => {
      try {
        switch (action) {
          case 'start':
            await kdsService.startTicket(ticketId);
            break;
          case 'ready':
            await kdsService.readyTicket(ticketId);
            break;
          case 'bump':
            await kdsService.bumpTicket(ticketId);
            break;
          case 'recall':
            await kdsService.recallTicket(ticketId);
            break;
        }
        if (selectedStation) await loadTickets(selectedStation.id);
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.message ?? e.message);
      }
    },
    [selectedStation, loadTickets],
  );

  const handleItemTap = useCallback(
    async (item: KDSTicketItem) => {
      const nextStatus = ITEM_STATUS_CYCLE[item.status];
      try {
        await kdsService.updateItemStatus(item.id, nextStatus);
        if (selectedStation) await loadTickets(selectedStation.id);
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.message ?? e.message);
      }
    },
    [selectedStation, loadTickets],
  );

  const handleTogglePriority = useCallback(
    async (ticket: KDSTicket) => {
      try {
        const next = ticket.priority > 1 ? 1 : 2;
        await kdsService.setPriority(ticket.id, next);
        if (selectedStation) await loadTickets(selectedStation.id);
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.message ?? e.message);
      }
    },
    [selectedStation, loadTickets],
  );

  const handleBumpAll = useCallback(async () => {
    if (!selectedStation) return;
    try {
      await kdsService.bumpAll(selectedStation.id);
      await loadTickets(selectedStation.id);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e.message);
    }
  }, [selectedStation, loadTickets]);

  const selectStation = useCallback(
    (station: KDSStation) => {
      setSelectedStation(station);
      loadTickets(station.id);
    },
    [loadTickets],
  );

  // ---- Render ----

  const visibleTickets = tickets.filter((t) => t.status !== 'BUMPED');

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-900`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-4 py-3 bg-gray-800`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={[tw`text-lg text-white ml-3`, typography.headingSemibold]}>
            Kitchen Display
          </Text>
        </View>
        {selectedStation && (
          <TouchableOpacity
            style={tw`bg-green-600 rounded-lg px-4 py-2 flex-row items-center`}
            onPress={handleBumpAll}
          >
            <MaterialCommunityIcons name="check-all" size={18} color="#fff" />
            <Text style={[tw`text-white text-sm ml-1`, typography.bodySemibold]}>Bump All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Station Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw`bg-gray-800 border-b border-gray-700`}
        contentContainerStyle={tw`px-3 py-2`}
      >
        {stations.map((s) => {
          const isActive = selectedStation?.id === s.id;
          const count = activeCount(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              style={tw`flex-row items-center px-4 py-2 rounded-full mr-2 ${
                isActive ? 'bg-blue-600' : 'bg-gray-700'
              }`}
              onPress={() => selectStation(s)}
            >
              <Text
                style={[
                  tw`text-sm ${isActive ? 'text-white' : 'text-gray-300'}`,
                  typography.bodySemibold,
                ]}
              >
                {s.name}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    tw`ml-2 rounded-full items-center justify-center`,
                    {
                      width: 20,
                      height: 20,
                      backgroundColor: isActive ? '#FFFFFF30' : '#FFFFFF20',
                    },
                  ]}
                >
                  <Text style={[tw`text-xs text-white`, typography.captionSemibold]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Ticket Rail */}
      <FlatList
        data={visibleTickets}
        keyExtractor={(t) => t.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-4 py-4`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#fff" />
        }
        renderItem={({ item: ticket }) => (
          <TicketCard
            ticket={ticket}
            seconds={elapsed[ticket.id] ?? getTicketAge(ticket)}
            onAction={handleTicketAction}
            onItemTap={handleItemTap}
            onTogglePriority={handleTogglePriority}
          />
        )}
        ListEmptyComponent={
          <View style={[tw`items-center justify-center`, { width: SCREEN_WIDTH - 32 }]}>
            <MaterialCommunityIcons name="monitor-dashboard" size={56} color="#6B7280" />
            <Text style={[tw`text-gray-500 mt-4 text-base`, typography.body]}>
              No active tickets
            </Text>
            <Text style={[tw`text-gray-600 mt-1`, typography.caption]}>
              Orders will appear here automatically
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
