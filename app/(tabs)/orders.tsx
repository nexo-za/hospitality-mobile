import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useOrder } from '@/contexts/OrderContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Check } from '@/types/hospitality';

type FilterTab = 'ALL' | 'READY' | 'OPEN' | 'CLOSED';

const FILTERS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All', icon: 'format-list-bulleted' },
  { key: 'READY', label: 'Ready', icon: 'bell-ring-outline' },
  { key: 'OPEN', label: 'Open', icon: 'clock-outline' },
  { key: 'CLOSED', label: 'Closed', icon: 'check-circle-outline' },
];

function formatElapsed(openedAt?: string): string {
  if (!openedAt) return '--';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getTimingColor(openedAt?: string): string {
  if (!openedAt) return 'text-gray-400';
  const mins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
  if (mins >= 60) return 'text-red-500';
  if (mins >= 30) return 'text-orange-500';
  return 'text-gray-500';
}

function getCheckUrgency(check: Check): 'ready' | 'alert' | 'normal' | 'closed' {
  if (check.status === 'CLOSED' || check.status === 'VOIDED') return 'closed';
  if (getReadyCount(check) > 0) return 'ready';
  const elapsed = (check as any).elapsedMinutes ?? (check.openedAt ? (Date.now() - new Date(check.openedAt).getTime()) / 60000 : 0);
  if (elapsed > 60) return 'alert';
  return 'normal';
}

function getItemCount(check: Check): number {
  if ((check as any).activeItemCount != null) return (check as any).activeItemCount;
  const items = check.items;
  if (items && items.length > 0) return items.filter((i) => i.status !== 'VOIDED').length;
  return (check as any)._count?.items ?? 0;
}

function getReadyCount(check: Check): number {
  if ((check as any).readyItemCount != null) return (check as any).readyItemCount;
  return (check.items || []).filter((i: any) => i.status === 'READY').length;
}

function getFiredCount(check: Check): number {
  if ((check as any).firedItemCount != null) return (check as any).firedItemCount;
  return (check.items || []).filter((i: any) => i.firingStatus === 'FIRE').length;
}

function getCheckTitle(check: Check): string {
  if (check.tableName) return check.tableName;
  const type = (check.checkType || 'DINE_IN').replace(/_/g, ' ');
  const shortNum = check.checkNumber?.split('-').pop() || check.id;
  return `${type} #${shortNum}`;
}

function CheckCard({ check, currentUserId, cardWidth }: { check: Check; currentUserId?: number; cardWidth: string }) {
  const router = useRouter();
  const urgency = getCheckUrgency(check);
  const itemCount = getItemCount(check);
  const isMyCheck = check.serverId === currentUserId;
  const readyCount = getReadyCount(check);
  const firedCount = getFiredCount(check);
  const title = getCheckTitle(check);
  const sectionName = (check as any).sectionName || (check as any).table?.section?.name;
  const elapsed = formatElapsed(check.openedAt);
  const timingColor = getTimingColor(check.openedAt);

  const topAccentColor =
    urgency === 'ready' ? '#16A34A' :
    urgency === 'alert' ? '#EF4444' :
    urgency === 'closed' ? '#9CA3AF' :
    '#3B82F6';

  return (
    <TouchableOpacity
      style={[tw`p-1.5 ${cardWidth}`]}
      onPress={() => router.push(`/order/${check.id}`)}
      activeOpacity={0.7}
    >
      <View style={[tw`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100`, { borderTopWidth: 3, borderTopColor: topAccentColor, minHeight: 180 }]}>
        <View style={tw`p-3.5 flex-1 justify-between`}>
          {/* Top section */}
          <View>
            <View style={tw`flex-row items-center mb-0.5`}>
              <Text style={[tw`text-sm text-gray-900 flex-1`, typography.bodySemibold]} numberOfLines={1}>
                {title}
              </Text>
              {isMyCheck && (
                <View style={tw`bg-indigo-50 rounded px-1.5 py-0.5 ml-1`}>
                  <Text style={tw`text-indigo-600 text-[9px] font-semibold`}>YOU</Text>
                </View>
              )}
            </View>

            {sectionName ? (
              <Text style={tw`text-[11px] text-gray-400`}>{sectionName}</Text>
            ) : null}

            <Text style={[tw`text-lg text-gray-900 mt-1`, typography.h3]}>
              R{(check.totalAmount ?? 0).toFixed(2)}
            </Text>
          </View>

          {/* Middle: Status pills */}
          <View style={tw`flex-row items-center gap-1.5 my-1`}>
            {urgency !== 'closed' && readyCount > 0 && (
              <View style={tw`flex-row items-center bg-green-50 border border-green-200 rounded-full px-2 py-0.5`}>
                <MaterialCommunityIcons name="bell-ring" size={11} color="#16A34A" />
                <Text style={tw`text-green-700 text-[10px] ml-1 font-semibold`}>{readyCount} ready</Text>
              </View>
            )}
            {urgency !== 'closed' && firedCount > 0 && readyCount === 0 && (
              <View style={tw`flex-row items-center bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5`}>
                <MaterialCommunityIcons name="fire" size={11} color="#EA580C" />
                <Text style={tw`text-orange-700 text-[10px] ml-1`}>{firedCount} cooking</Text>
              </View>
            )}
            {urgency === 'closed' && (
              <View style={tw`bg-gray-100 rounded px-1.5 py-0.5`}>
                <Text style={tw`text-gray-500 text-[9px]`}>{check.status}</Text>
              </View>
            )}
          </View>

          {/* Bottom: meta + balance */}
          <View style={tw`border-t border-gray-50 pt-2`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons name="account-outline" size={12} color="#9CA3AF" />
                <Text style={tw`text-[10px] text-gray-500 ml-0.5`}>{check.guestCount}</Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={12} color="#9CA3AF" />
                <Text style={tw`text-[10px] text-gray-500 ml-0.5`}>{itemCount}</Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={urgency === 'alert' ? '#EF4444' : '#9CA3AF'} />
                <Text style={tw`text-[10px] ${timingColor} ml-0.5`}>{elapsed}</Text>
              </View>
              <Text style={tw`text-[10px] text-gray-400 flex-1`} numberOfLines={1}>{check.serverName || 'Unassigned'}</Text>
            </View>
            {(check.balanceDue ?? 0) > 0 && check.status !== 'CLOSED' && (check.paidAmount ?? 0) > 0 && (
              <Text style={tw`text-[10px] text-red-500 font-semibold mt-1`}>Due R{(check.balanceDue ?? 0).toFixed(2)}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const { activeChecks, isLoading, error, loadActiveChecks } = useOrder();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const { width } = useWindowDimensions();

  const currentUserId = (user as any)?.id;
  const storeId = (user as any)?.storeId;
  const cardWidth = width >= 1024 ? 'w-1/4' : width >= 768 ? 'w-1/3' : 'w-1/2';

  const loadOrders = useCallback((filter?: FilterTab) => {
    const f = filter ?? activeFilter;
    const status = f === 'CLOSED' ? 'CLOSED' : f === 'OPEN' ? 'OPEN' : undefined;
    loadActiveChecks({ storeId, status, serverId: currentUserId }).catch(() => undefined);
  }, [storeId, activeFilter, currentUserId, loadActiveChecks]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadOrders();
    }, [user, loadOrders])
  );

  useEffect(() => {
    loadOrders(activeFilter);
  }, [activeFilter]);

  useRealtimeUpdates({
    storeId,
    onCheckUpdate: () => loadOrders(),
    onKdsUpdate: () => loadOrders(),
    onOrderReady: () => loadOrders(),
  });

  const onRefresh = useCallback(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredChecks = useMemo(() => {
    let checks = activeChecks;
    switch (activeFilter) {
      case 'READY':
        checks = checks.filter((c) => c.status !== 'CLOSED' && c.status !== 'VOIDED' && getReadyCount(c) > 0);
        break;
      case 'OPEN':
        checks = checks.filter((c) => c.status === 'OPEN' || c.status === 'REOPENED');
        break;
      case 'CLOSED':
        checks = checks.filter((c) => c.status === 'CLOSED' || c.status === 'VOIDED');
        break;
    }
    const order = { ready: 0, alert: 1, normal: 2, closed: 3 };
    return [...checks].sort((a, b) => {
      const uA = getCheckUrgency(a);
      const uB = getCheckUrgency(b);
      if (order[uA] !== order[uB]) return order[uA] - order[uB];
      return new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime();
    });
  }, [activeChecks, activeFilter]);

  const readyCount = activeChecks.filter((c) => c.status !== 'CLOSED' && c.status !== 'VOIDED' && getReadyCount(c) > 0).length;
  const openCount = activeChecks.filter((c) => c.status === 'OPEN' || c.status === 'REOPENED').length;

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`px-4 pt-4 pb-2`}>
        <Text style={[tw`text-xl text-gray-900`, typography.h2]}>Orders</Text>
        <Text style={tw`text-sm text-gray-400 mt-0.5`}>
          {openCount} open{readyCount > 0 ? ` · ${readyCount} ready for pickup` : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={tw`h-14 border-b border-gray-100`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 h-14 items-center`}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const showBadge = f.key === 'READY' && readyCount > 0;
            return (
              <TouchableOpacity
                key={f.key}
                style={tw`flex-row items-center mr-2 px-4 py-2 rounded-full ${isActive ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}
                onPress={() => setActiveFilter(f.key)}
              >
                <MaterialCommunityIcons
                  name={f.icon as any}
                  size={16}
                  color={isActive ? '#fff' : '#6B7280'}
                />
                <Text style={tw`ml-1.5 text-sm ${isActive ? 'text-white font-semibold' : 'text-gray-600'}`}>
                  {f.label}
                </Text>
                {showBadge && (
                  <View style={tw`bg-green-500 rounded-full min-w-[18px] h-[18px] items-center justify-center ml-1.5`}>
                    <Text style={tw`text-white text-[10px] font-bold`}>{readyCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error && (
        <View style={tw`bg-red-50 p-3 rounded-lg mb-3 mx-4 mt-2`}>
          <Text style={tw`text-red-700 text-sm`}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={tw`px-2.5 pt-3 pb-8`}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        {isLoading && filteredChecks.length === 0 ? (
          <View style={tw`items-center py-16`}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : filteredChecks.length === 0 ? (
          <View style={tw`items-center justify-center py-20`}>
            <MaterialCommunityIcons
              name={activeFilter === 'READY' ? 'bell-off-outline' : 'clipboard-text-outline'}
              size={48}
              color="#D1D5DB"
            />
            <Text style={tw`text-gray-400 mt-3 text-center`}>
              {activeFilter === 'READY' ? 'No orders ready for pickup' :
               activeFilter === 'CLOSED' ? 'No closed orders' :
               'No active orders'}
            </Text>
          </View>
        ) : (
          <View style={tw`flex-row flex-wrap`}>
            {filteredChecks.map((check) => (
              <CheckCard key={check.id} check={check} currentUserId={currentUserId} cardWidth={cardWidth} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
