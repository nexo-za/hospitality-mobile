import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import reportsService from '@/api/services/reportsService';
import type {
  RevenueReport,
  DashboardSummary,
} from '@/types/hospitality';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type Period = 'today' | 'week' | 'month';

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return 'R0.00';
  return `R${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDateRange(period: Period) {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  let dateFrom = dateTo;
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    dateFrom = d.toISOString().slice(0, 10);
  } else if (period === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    dateFrom = d.toISOString().slice(0, 10);
  }
  return { dateFrom, dateTo };
}

interface KpiCardProps {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  subtitle?: string;
}

function KpiCard({ icon, color, label, value, subtitle }: KpiCardProps) {
  return (
    <View
      style={[
        tw`bg-white rounded-xl p-4 flex-1`,
        { minWidth: '47%' },
      ]}
    >
      <View style={tw`flex-row items-center mb-2`}>
        <View
          style={[
            tw`w-8 h-8 rounded-lg items-center justify-center mr-2`,
            { backgroundColor: color + '15' },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={18} color={color} />
        </View>
        <Text style={[tw`text-xs text-gray-400`, typography.small]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[tw`text-lg`, typography.headingSemibold]} numberOfLines={1}>
        {value}
      </Text>
      {subtitle ? (
        <Text style={[tw`text-xs text-gray-400 mt-0.5`, typography.small]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

interface ReportRowProps {
  icon: IconName;
  color: string;
  label: string;
  onPress: () => void;
}

function ReportRow({ icon, color, label, onPress }: ReportRowProps) {
  return (
    <TouchableOpacity
      style={tw`flex-row items-center px-4 py-3.5 border-b border-gray-50`}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View
        style={[
          tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
          { backgroundColor: color + '12' },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[tw`flex-1 text-base`, typography.body]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const { dateFrom, dateTo } = getDateRange(period);
      const params = { storeId: user?.storeId, dateFrom, dateTo };

      const [summaryRes, revenueRes] = await Promise.allSettled([
        reportsService.getDashboardSummary(params),
        reportsService.getRevenueReport(params),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (revenueRes.status === 'fulfilled') setRevenue(revenueRes.value);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [period, user?.storeId]);

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

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Reports', headerShown: true, headerBackTitle: 'Back' }} />
      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        contentContainerStyle={tw`pb-12`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Period Selector */}
        <View style={tw`flex-row mx-4 mt-4 bg-white rounded-xl p-1`}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                tw`flex-1 py-2 rounded-lg items-center`,
                period === p.key && tw`bg-blue-500`,
              ]}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  tw`text-sm`,
                  typography.captionSemibold,
                  { color: period === p.key ? '#fff' : '#9CA3AF' },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={tw`py-20 items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
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
            {/* KPI Grid */}
            <View style={tw`mx-4 mt-4`}>
              <View style={tw`flex-row gap-3 mb-3`}>
                <KpiCard
                  icon="currency-usd"
                  color="#10B981"
                  label="Revenue"
                  value={formatCurrency(summary?.totalRevenue ?? revenue?.totalRevenue)}
                />
                <KpiCard
                  icon="receipt"
                  color="#3B82F6"
                  label="Checks"
                  value={String(summary?.closedChecks ?? 0)}
                  subtitle={summary?.openChecks ? `${summary.openChecks} open` : undefined}
                />
              </View>
              <View style={tw`flex-row gap-3 mb-3`}>
                <KpiCard
                  icon="cash-multiple"
                  color="#F59E0B"
                  label="Avg Check"
                  value={formatCurrency(summary?.avgCheckAmount)}
                />
                <KpiCard
                  icon="account-multiple"
                  color="#8B5CF6"
                  label="Covers"
                  value={String(summary?.totalCovers ?? 0)}
                />
              </View>
              {revenue && (
                <View style={tw`flex-row gap-3`}>
                  <KpiCard
                    icon="tag-outline"
                    color="#EF4444"
                    label="Discounts"
                    value={formatCurrency(revenue.totalDiscounts)}
                  />
                  <KpiCard
                    icon="percent-outline"
                    color="#0EA5E9"
                    label="Service Charges"
                    value={formatCurrency(revenue.totalServiceCharges)}
                  />
                </View>
              )}
            </View>

            {/* Detailed Reports */}
            <View style={tw`mt-6`}>
              <Text style={[tw`text-xs text-gray-400 px-5 mb-2`, typography.captionSemibold, { letterSpacing: 0.8 }]}>
                DETAILED REPORTS
              </Text>
              <View style={tw`bg-white mx-4 rounded-xl overflow-hidden`}>
                <ReportRow
                  icon="chart-timeline-variant"
                  color="#10B981"
                  label="Revenue Breakdown"
                  onPress={() => {}}
                />
                <ReportRow
                  icon="table-furniture"
                  color="#6366F1"
                  label="Table Turns"
                  onPress={() => {}}
                />
                <ReportRow
                  icon="clock-outline"
                  color="#F97316"
                  label="Hourly Sales"
                  onPress={() => {}}
                />
                <ReportRow
                  icon="close-circle-outline"
                  color="#EF4444"
                  label="Voids & Comps"
                  onPress={() => {}}
                />
                <ReportRow
                  icon="food-variant"
                  color="#EC4899"
                  label="Menu Performance"
                  onPress={() => {}}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}
