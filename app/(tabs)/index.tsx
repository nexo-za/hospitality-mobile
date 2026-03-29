import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useTables } from '@/contexts/TablesContext';
import { useShift } from '@/app/contexts/ShiftContext';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import reportsService from '@/api/services/reportsService';
import type {
  WaiterPerformance,
  LiveOperations,
  DashboardSummary,
  TopItem,
  RecentCheck,
  Table,
} from '@/types/hospitality';

const COLORS = {
  revenue: '#10B981',
  checks: '#3B82F6',
  tips: '#F59E0B',
  covers: '#8B5CF6',
  avgCheck: '#EC4899',
  kitchen: '#F97316',
  tables: '#06B6D4',
  waitlist: '#6366F1',
  growth: '#10B981',
  decline: '#EF4444',
};

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return 'R0.00';
  return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatGrowth(percent: number | undefined | null): string {
  if (percent == null || isNaN(percent)) return '--';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

function formatElapsed(openedAt?: string | null): string {
  if (!openedAt) return '--';
  const diff = Date.now() - new Date(openedAt).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatShiftDuration(startTime?: string | null): string {
  if (!startTime) return '';
  const diff = Date.now() - new Date(startTime).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ShiftBanner({ shift, isActive }: { shift: any; isActive: boolean }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={tw`mx-4 mt-4 rounded-2xl overflow-hidden`}
      onPress={() => router.push(isActive ? '/more/shift' : '/screens/StartShiftScreen')}
      activeOpacity={0.8}
    >
      <View
        style={[
          tw`flex-row items-center px-4 py-3 rounded-2xl`,
          { backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2' },
        ]}
      >
        <View
          style={[
            tw`w-8 h-8 rounded-full items-center justify-center mr-3`,
            { backgroundColor: isActive ? '#D1FAE5' : '#FEE2E2' },
          ]}
        >
          <MaterialCommunityIcons
            name={isActive ? 'clock-check-outline' : 'clock-alert-outline'}
            size={18}
            color={isActive ? '#059669' : '#DC2626'}
          />
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-sm`, typography.bodySemibold, { color: isActive ? '#065F46' : '#991B1B' }]}>
            {isActive ? 'Shift Active' : 'No Active Shift'}
          </Text>
          <Text style={[tw`text-xs`, typography.caption, { color: isActive ? '#047857' : '#B91C1C' }]}>
            {isActive
              ? `Started ${formatShiftDuration(shift?.startTime)} ago`
              : 'Tap to start your shift'}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={isActive ? '#059669' : '#DC2626'}
        />
      </View>
    </TouchableOpacity>
  );
}

function RevenueHero({ summary }: { summary: DashboardSummary | null }) {
  const growthPositive = (summary?.revenueGrowthPercent ?? 0) >= 0;

  return (
    <View style={tw`mx-4 mt-4 bg-white rounded-2xl p-5 border border-gray-100`}>
      <View style={tw`flex-row items-center justify-between mb-1`}>
        <Text style={[tw`text-xs text-gray-400 uppercase`, typography.captionSemibold]}>
          Today's Revenue
        </Text>
        {summary && (
          <View
            style={[
              tw`flex-row items-center px-2 py-0.5 rounded-full`,
              { backgroundColor: growthPositive ? '#ECFDF5' : '#FEF2F2' },
            ]}
          >
            <MaterialCommunityIcons
              name={growthPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={growthPositive ? COLORS.growth : COLORS.decline}
            />
            <Text
              style={[
                tw`text-xs ml-1`,
                typography.captionSemibold,
                { color: growthPositive ? COLORS.growth : COLORS.decline },
              ]}
            >
              {formatGrowth(summary.revenueGrowthPercent)}
            </Text>
          </View>
        )}
      </View>
      <Text style={[tw`text-3xl mt-1`, typography.h1]}>
        {formatCurrency(summary?.totalRevenue)}
      </Text>
      <View style={tw`flex-row mt-4`}>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs text-gray-400`, typography.small]}>Closed Checks</Text>
          <Text style={[tw`text-base`, typography.bodySemibold]}>
            {summary?.closedChecks ?? '--'}
          </Text>
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs text-gray-400`, typography.small]}>Open Checks</Text>
          <Text style={[tw`text-base text-blue-600`, typography.bodySemibold]}>
            {summary?.openChecks ?? '--'}
          </Text>
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-xs text-gray-400`, typography.small]}>Voided</Text>
          <Text style={[tw`text-base text-red-500`, typography.bodySemibold]}>
            {summary?.voidedChecks ?? '--'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function KpiStrip({ summary }: { summary: DashboardSummary | null }) {
  const kpis = [
    { icon: 'chart-line', label: 'Avg Check', value: formatCurrency(summary?.avgCheckAmount), color: COLORS.avgCheck },
    { icon: 'account-multiple', label: 'Covers', value: String(summary?.totalCovers ?? '--'), color: COLORS.covers },
    { icon: 'hand-coin', label: 'Tips', value: formatCurrency(summary?.totalTips), color: COLORS.tips },
    { icon: 'currency-usd', label: 'Rev/Cover', value: formatCurrency(summary?.revenuePerCover), color: COLORS.revenue },
  ];

  return (
    <View style={tw`flex-row mx-3 mt-3`}>
      {kpis.map((kpi) => (
        <View key={kpi.label} style={tw`flex-1 bg-white rounded-xl p-3 mx-1 border border-gray-100`}>
          <View style={tw`flex-row items-center mb-1`}>
            <MaterialCommunityIcons name={kpi.icon as any} size={14} color={kpi.color} />
            <Text style={[tw`text-xs text-gray-400 ml-1`, typography.small]} numberOfLines={1}>
              {kpi.label}
            </Text>
          </View>
          <Text style={[tw`text-sm`, typography.bodySemibold]} numberOfLines={1}>
            {kpi.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PaymentMixBar({ summary }: { summary: DashboardSummary | null }) {
  if (!summary) return null;
  const { cash, card, digital, other } = summary.paymentBreakdown;
  const total = cash + card + digital + other;
  if (total === 0) return null;

  const segments = [
    { label: 'Cash', value: cash, color: '#10B981' },
    { label: 'Card', value: card, color: '#3B82F6' },
    { label: 'Digital', value: digital, color: '#8B5CF6' },
    { label: 'Other', value: other, color: '#9CA3AF' },
  ].filter((s) => s.value > 0);

  return (
    <View style={tw`mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100`}>
      <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
        Payment Mix
      </Text>
      <View style={tw`flex-row h-2 rounded-full overflow-hidden bg-gray-100`}>
        {segments.map((seg) => (
          <View
            key={seg.label}
            style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
          />
        ))}
      </View>
      <View style={tw`flex-row mt-3 flex-wrap`}>
        {segments.map((seg) => (
          <View key={seg.label} style={tw`flex-row items-center mr-4 mb-1`}>
            <View style={[tw`w-2 h-2 rounded-full mr-1`, { backgroundColor: seg.color }]} />
            <Text style={[tw`text-xs text-gray-500`, typography.small]}>
              {seg.label} {formatCurrency(seg.value)} ({((seg.value / total) * 100).toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActiveTableCard({ table }: { table: Table }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={tw`bg-white rounded-xl p-3 mr-3 w-32 border border-gray-100`}
      onPress={() => router.push(`/table/${table.id}`)}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center mb-2`}>
        <View style={tw`w-7 h-7 rounded-full bg-blue-50 items-center justify-center`}>
          <MaterialCommunityIcons name="table-furniture" size={14} color="#3B82F6" />
        </View>
        <Text style={[tw`text-sm ml-2 flex-1`, typography.captionSemibold]} numberOfLines={1}>
          {table.name || `T${table.tableNumber}`}
        </Text>
      </View>
      <View style={tw`flex-row items-center`}>
        <MaterialCommunityIcons name="clock-outline" size={11} color="#9CA3AF" />
        <Text style={[tw`text-xs text-gray-400 ml-1`, typography.small]}>
          {formatElapsed(table.checkOpenedAt)}
        </Text>
        {table.activeCheck && (
          <Text style={[tw`text-xs text-green-600 ml-auto`, typography.smallMedium]}>
            {formatCurrency(table.activeCheck.grandTotal)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function LiveOpsCard({ liveOps }: { liveOps: LiveOperations | null }) {
  if (!liveOps) return null;
  const { tables, kitchen, reservations, waitlist } = liveOps;

  return (
    <View style={tw`mx-4 mt-3 bg-white rounded-2xl border border-gray-100 overflow-hidden`}>
      <View style={tw`p-4 pb-3`}>
        <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
          Live Operations
        </Text>

        {/* Table utilization */}
        <View style={tw`flex-row items-center mb-3`}>
          <View
            style={[
              tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
              { backgroundColor: '#F0F9FF' },
            ]}
          >
            <MaterialCommunityIcons name="table-furniture" size={18} color={COLORS.tables} />
          </View>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={[tw`text-sm`, typography.captionSemibold]}>Tables</Text>
              <Text style={[tw`text-sm text-gray-500`, typography.caption]}>
                {tables.occupied}/{tables.total} occupied
              </Text>
            </View>
            <View style={tw`flex-row h-1.5 rounded-full bg-gray-100 mt-1.5`}>
              <View
                style={[
                  tw`rounded-full`,
                  {
                    width: tables.total > 0 ? `${(tables.occupied / tables.total) * 100}%` : '0%',
                    backgroundColor: COLORS.tables,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Small table status chips */}
        <View style={tw`flex-row flex-wrap mb-3 ml-12`}>
          {[
            { label: 'Available', count: tables.available, color: '#10B981' },
            { label: 'Reserved', count: tables.reserved, color: '#F59E0B' },
            { label: 'Dirty', count: tables.dirty, color: '#EF4444' },
          ]
            .filter((s) => s.count > 0)
            .map((s) => (
              <View key={s.label} style={tw`flex-row items-center mr-3 mb-1`}>
                <View style={[tw`w-1.5 h-1.5 rounded-full mr-1`, { backgroundColor: s.color }]} />
                <Text style={[tw`text-xs text-gray-500`, typography.small]}>
                  {s.count} {s.label}
                </Text>
              </View>
            ))}
        </View>

        {/* Kitchen */}
        <View style={tw`flex-row items-center mb-3`}>
          <View
            style={[
              tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
              { backgroundColor: '#FFF7ED' },
            ]}
          >
            <MaterialCommunityIcons name="chef-hat" size={18} color={COLORS.kitchen} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-sm`, typography.captionSemibold]}>Kitchen</Text>
            <View style={tw`flex-row items-center mt-0.5`}>
              <Text style={[tw`text-xs text-gray-500`, typography.small]}>
                {kitchen.pendingTickets} pending
              </Text>
              {kitchen.avgCompletionMinutes != null && (
                <Text style={[tw`text-xs text-gray-400 ml-3`, typography.small]}>
                  ~{kitchen.avgCompletionMinutes}min avg
                </Text>
              )}
            </View>
          </View>
          {kitchen.pendingTickets > 5 && (
            <View style={tw`bg-orange-100 px-2 py-0.5 rounded-full`}>
              <Text style={[tw`text-xs text-orange-700`, typography.smallMedium]}>Busy</Text>
            </View>
          )}
        </View>

        {/* Reservations + Waitlist */}
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 flex-row items-center`}>
            <View
              style={[
                tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                { backgroundColor: '#EEF2FF' },
              ]}
            >
              <MaterialCommunityIcons name="calendar-clock" size={18} color={COLORS.waitlist} />
            </View>
            <View>
              <Text style={[tw`text-sm`, typography.captionSemibold]}>
                {reservations.total} Reservations
              </Text>
              <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                {reservations.expectedCovers} expected covers
              </Text>
            </View>
          </View>
          {waitlist.count > 0 && (
            <View style={tw`flex-row items-center`}>
              <View style={tw`bg-indigo-100 px-2.5 py-1 rounded-full`}>
                <Text style={[tw`text-xs text-indigo-700`, typography.smallMedium]}>
                  {waitlist.totalWaiting} waiting
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ShiftPerformanceCard({ performance }: { performance: WaiterPerformance | null }) {
  if (!performance) return null;

  const stats = [
    { label: 'Revenue', value: formatCurrency(performance.totalRevenue), color: COLORS.revenue },
    { label: 'Checks', value: String(performance.totalChecks || 0), color: COLORS.checks },
    { label: 'Tips', value: formatCurrency(performance.totalTips), color: COLORS.tips },
    { label: 'Covers', value: String(performance.totalCovers || 0), color: COLORS.covers },
    { label: 'Avg Check', value: formatCurrency(performance.avgCheckAmount), color: COLORS.avgCheck },
    { label: 'Rev/Cover', value: formatCurrency(performance.revenuePerCover), color: '#14B8A6' },
  ];

  return (
    <View style={tw`mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100`}>
      <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
        My Shift Performance
      </Text>
      <View style={tw`flex-row flex-wrap`}>
        {stats.map((stat) => (
          <View key={stat.label} style={tw`w-1/3 mb-3`}>
            <Text style={[tw`text-xs text-gray-400`, typography.small]}>{stat.label}</Text>
            <Text style={[tw`text-sm mt-0.5`, typography.bodySemibold, { color: stat.color }]}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TopItemsList({ items }: { items: TopItem[] }) {
  if (!items.length) return null;

  return (
    <View style={tw`mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100`}>
      <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
        Top Sellers
      </Text>
      {items.slice(0, 5).map((item, idx) => (
        <View
          key={item.menuItemId}
          style={tw`flex-row items-center py-2 ${idx < Math.min(items.length, 5) - 1 ? 'border-b border-gray-50' : ''}`}
        >
          <View
            style={[
              tw`w-6 h-6 rounded-full items-center justify-center mr-3`,
              { backgroundColor: idx < 3 ? '#FEF3C7' : '#F3F4F6' },
            ]}
          >
            <Text
              style={[
                tw`text-xs`,
                typography.smallMedium,
                { color: idx < 3 ? '#D97706' : '#6B7280' },
              ]}
            >
              {idx + 1}
            </Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-sm`, typography.captionSemibold]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[tw`text-xs text-gray-400`, typography.small]}>
              {item.totalQuantity} sold · {item.category}
            </Text>
          </View>
          <View style={tw`items-end`}>
            <Text style={[tw`text-sm`, typography.captionSemibold]}>
              {formatCurrency(item.totalRevenue)}
            </Text>
            <Text style={[tw`text-xs text-gray-400`, typography.small]}>
              {item.revenuePercent.toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function RecentChecksCard({ checks }: { checks: RecentCheck[] }) {
  const router = useRouter();
  if (!checks.length) return null;

  return (
    <View style={tw`mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100`}>
      <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
        Recent Activity
      </Text>
      {checks.slice(0, 5).map((check, idx) => (
        <TouchableOpacity
          key={check.id}
          style={tw`flex-row items-center py-2.5 ${idx < Math.min(checks.length, 5) - 1 ? 'border-b border-gray-50' : ''}`}
          onPress={() => router.push(`/order/${check.id}`)}
          activeOpacity={0.7}
        >
          <View style={tw`w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3`}>
            <MaterialCommunityIcons name="receipt" size={16} color="#6B7280" />
          </View>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center`}>
              <Text style={[tw`text-sm`, typography.captionSemibold]}>
                #{check.checkNumber?.split('-').pop()}
              </Text>
              {check.table && (
                <Text style={[tw`text-xs text-gray-400 ml-2`, typography.small]}>
                  {check.table.label || `T${check.table.number}`}
                </Text>
              )}
            </View>
            <View style={tw`flex-row items-center mt-0.5`}>
              {check.server && (
                <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                  {check.server.name}
                </Text>
              )}
              {check.durationMinutes != null && (
                <Text style={[tw`text-xs text-gray-300 ml-2`, typography.small]}>
                  {check.durationMinutes}min
                </Text>
              )}
            </View>
          </View>
          <View style={tw`items-end`}>
            <Text style={[tw`text-sm`, typography.captionSemibold]}>
              {formatCurrency(check.grandTotal)}
            </Text>
            <View style={tw`flex-row items-center mt-0.5`}>
              {check.paymentMethods.map((method) => (
                <View
                  key={method}
                  style={tw`bg-gray-100 px-1.5 py-0.5 rounded ml-1`}
                >
                  <Text style={[tw`text-xs text-gray-500`, { fontSize: 10 }]}>
                    {method}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function QuickActions() {
  const router = useRouter();
  const actions = [
    { icon: 'floor-plan', label: 'Floor Plan', route: '/(tabs)/tables', color: '#3B82F6' },
    { icon: 'plus-circle', label: 'New Order', route: '/order/new', color: '#10B981' },
    { icon: 'food', label: 'Menu', route: '/(tabs)/menu', color: '#8B5CF6' },
    { icon: 'cash-register', label: 'Cash Till', route: '/more/cash-till', color: '#F59E0B' },
  ];

  return (
    <View style={tw`mx-3 mt-3`}>
      <Text style={[tw`text-xs text-gray-400 uppercase mb-2 px-1`, typography.captionSemibold]}>
        Quick Actions
      </Text>
      <View style={tw`flex-row`}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={tw`flex-1 bg-white rounded-xl py-3.5 mx-1 items-center border border-gray-100`}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center mb-2`,
                { backgroundColor: action.color + '12' },
              ]}
            >
              <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
            </View>
            <Text
              style={[tw`text-xs text-gray-600 text-center`, typography.captionSemibold]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function NoShiftState() {
  const router = useRouter();

  return (
    <View style={tw`items-center py-16 px-8`}>
      <View style={tw`w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
        <MaterialCommunityIcons name="view-dashboard-outline" size={32} color="#9CA3AF" />
      </View>
      <Text style={[tw`text-gray-500 text-center mb-1`, typography.bodySemibold]}>
        Welcome to your Dashboard
      </Text>
      <Text style={[tw`text-gray-400 text-center mb-6`, typography.caption]}>
        Start a shift to see your performance metrics and live restaurant data
      </Text>
      <TouchableOpacity
        style={[tw`px-6 py-3 rounded-xl`, { backgroundColor: '#3B82F6' }]}
        onPress={() => router.push('/screens/StartShiftScreen')}
        activeOpacity={0.8}
      >
        <Text style={[tw`text-white`, typography.bodySemibold]}>Start Shift</Text>
      </TouchableOpacity>
    </View>
  );
}

function DataUnavailableState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={tw`items-center py-12 px-8`}>
      <View style={tw`w-14 h-14 rounded-full bg-amber-50 items-center justify-center mb-3`}>
        <MaterialCommunityIcons name="cloud-off-outline" size={28} color="#D97706" />
      </View>
      <Text style={[tw`text-gray-500 text-center mb-1`, typography.bodySemibold]}>
        Couldn't load dashboard data
      </Text>
      <Text style={[tw`text-gray-400 text-center mb-4`, typography.caption]}>
        Your shift is active — pull down to refresh or tap below
      </Text>
      <TouchableOpacity
        style={tw`flex-row items-center px-5 py-2.5 rounded-xl bg-gray-100`}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="refresh" size={16} color="#6B7280" />
        <Text style={[tw`text-gray-600 ml-2`, typography.captionSemibold]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { myTables } = useTables();
  const { currentShift, isShiftActive } = useShift();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [liveOps, setLiveOps] = useState<LiveOperations | null>(null);
  const [performance, setPerformance] = useState<WaiterPerformance | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [recentChecks, setRecentChecks] = useState<RecentCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const occupiedTables = myTables.filter((t) => t.status === 'OCCUPIED');
  const storeId = (user as any)?.storeId;

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const results = await Promise.allSettled([
          reportsService.getDashboardSummary({ storeId }),
          reportsService.getLiveOperations(storeId),
          reportsService.getWaiterCurrentShift(storeId),
          reportsService.getTopItems({ storeId, limit: 5 }),
          reportsService.getRecentChecks({ storeId, limit: 5 }),
        ]);

        if (results[0].status === 'fulfilled') setSummary(results[0].value);
        if (results[1].status === 'fulfilled') setLiveOps(results[1].value);
        if (results[2].status === 'fulfilled') setPerformance(results[2].value);
        if (results[3].status === 'fulfilled') setTopItems(results[3].value);
        if (results[4].status === 'fulfilled') setRecentChecks(results[4].value);
      } catch {
        // partial data is acceptable
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, storeId],
  );

  // Single focus-based load: handles both initial mount and tab re-focus
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  // Poll live operations every 30s while screen is focused
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(async () => {
        try {
          const ops = await reportsService.getLiveOperations(storeId);
          setLiveOps(ops);
        } catch {
          // silently fail on poll
        }
      }, 30000);
      return () => clearInterval(interval);
    }, [storeId]),
  );

  // Stable references to avoid re-subscribing sockets on every render
  const handleRealtimeUpdate = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  useRealtimeUpdates({
    storeId,
    onCheckUpdate: handleRealtimeUpdate,
    onTableUpdate: handleRealtimeUpdate,
  });

  const hasData = summary || liveOps || performance;
  const showDashboard = hasData || isShiftActive;

  if (loading && !hasData) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[tw`mt-3 text-gray-500`, typography.body]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`pb-8`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={tw`px-4 pt-4 pb-1`}>
        <Text style={[tw`text-xl`, typography.h3]}>
          Hi, {(user as any)?.firstName || 'there'}
        </Text>
      </View>

      {/* Shift Status */}
      <ShiftBanner shift={currentShift} isActive={isShiftActive} />

      {!showDashboard && !loading ? (
        <NoShiftState />
      ) : (
        <>
          {/* Revenue Hero */}
          <RevenueHero summary={summary} />

          {/* KPI Strip */}
          <KpiStrip summary={summary} />

          {/* Payment Mix */}
          <PaymentMixBar summary={summary} />

          {/* Active Tables */}
          {occupiedTables.length > 0 && (
            <View style={tw`mt-4`}>
              <View style={tw`flex-row items-center justify-between px-4 mb-2`}>
                <Text style={[tw`text-xs text-gray-400 uppercase`, typography.captionSemibold]}>
                  My Active Tables
                </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/tables')}>
                  <Text style={[tw`text-xs text-blue-500`, typography.captionSemibold]}>
                    View All
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-4`}
              >
                {occupiedTables.map((table) => (
                  <ActiveTableCard key={table.id} table={table} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Live Operations */}
          <LiveOpsCard liveOps={liveOps} />

          {/* My Shift Performance */}
          <ShiftPerformanceCard performance={performance} />

          {/* Top Sellers */}
          <TopItemsList items={topItems} />

          {/* Recent Activity */}
          <RecentChecksCard checks={recentChecks} />

          {/* Show retry prompt when shift is active but no API data loaded */}
          {!hasData && !loading && (
            <DataUnavailableState onRetry={() => loadDashboard()} />
          )}
        </>
      )}

      {/* Quick Actions - always visible */}
      <QuickActions />
    </ScrollView>
  );
}
