import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useGuests } from '@/contexts/GuestsContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GuestProfile, GuestHistoryEntry } from '@/types/hospitality';

const DIETARY_KEYWORDS = [
  'allergy',
  'allergen',
  'dietary',
  'vegetarian',
  'vegan',
  'gluten-free',
  'gluten free',
  'nut-free',
  'nut free',
  'lactose',
  'dairy-free',
  'dairy free',
  'halal',
  'kosher',
  'shellfish',
  'seafood',
  'egg',
  'soy',
  'wheat',
  'celiac',
];

function isDietaryTag(tag: string): boolean {
  const lower = tag.toLowerCase();
  return DIETARY_KEYWORDS.some((kw) => lower.includes(kw));
}

function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GuestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getGuest, getGuestHistory } = useGuests();

  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [history, setHistory] = useState<GuestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const guestId = parseInt(id, 10);
    if (isNaN(guestId)) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [guestData, historyData] = await Promise.all([
          getGuest(guestId),
          getGuestHistory(guestId),
        ]);
        if (!cancelled) {
          setGuest(guestData);
          setHistory(historyData);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load guest');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, getGuest, getGuestHistory]);

  const { dietaryTags, regularTags } = useMemo(() => {
    const tags = guest?.tags ?? [];
    return {
      dietaryTags: tags.filter(isDietaryTag),
      regularTags: tags.filter((t) => !isDietaryTag(t)),
    };
  }, [guest?.tags]);

  const fullName = guest
    ? [guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest'
    : 'Guest';

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 items-center justify-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
          Loading guest...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !guest) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={[tw`text-lg ml-3`, typography.headingSemibold]}>
            Guest
          </Text>
        </View>
        <View style={tw`items-center py-16`}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[tw`text-red-500 mt-3`, typography.body]}>
            {error || 'Guest not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3 flex-1`, typography.headingSemibold]} numberOfLines={1}>
          {fullName}
        </Text>
        {guest.isVIP && (
          <View style={tw`bg-yellow-400 rounded-full px-3 py-1 flex-row items-center`}>
            <MaterialCommunityIcons name="star" size={14} color="#78350F" />
            <Text style={[tw`text-xs ml-1`, { color: '#78350F', fontFamily: 'Geist-Bold' }]}>
              VIP
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-12`}>
        {/* Profile avatar + name */}
        <View style={tw`items-center mb-6`}>
          <View style={tw`w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-3`}>
            <Text style={[tw`text-blue-600 text-2xl`, typography.h2]}>
              {(guest.firstName?.[0] ?? '').toUpperCase()}
              {(guest.lastName?.[0] ?? '').toUpperCase()}
            </Text>
          </View>
          <Text style={[tw`text-xl`, typography.h3]}>{fullName}</Text>
          {guest.isVIP && (
            <View style={tw`bg-yellow-100 rounded-full px-4 py-1 mt-2 flex-row items-center`}>
              <MaterialCommunityIcons name="star" size={16} color="#B45309" />
              <Text style={[tw`text-sm text-yellow-700 ml-1`, typography.captionSemibold]}>
                VIP Guest
              </Text>
            </View>
          )}
        </View>

        {/* Dietary / Allergy Warnings */}
        {dietaryTags.length > 0 && (
          <View style={tw`bg-red-50 border border-red-200 rounded-xl p-4 mb-4`}>
            <View style={tw`flex-row items-center mb-2`}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
              <Text style={[tw`text-sm text-red-700 ml-2`, typography.captionSemibold]}>
                Allergies & Dietary Requirements
              </Text>
            </View>
            <View style={tw`flex-row flex-wrap`}>
              {dietaryTags.map((tag) => (
                <View
                  key={tag}
                  style={tw`bg-red-100 border border-red-300 rounded-full px-3 py-1 mr-2 mb-2`}
                >
                  <Text style={[tw`text-xs text-red-800`, typography.captionSemibold]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact Info */}
        <View style={tw`bg-white rounded-xl border border-gray-100 p-4 mb-4`}>
          <Text
            style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}
          >
            Contact Information
          </Text>
          {guest.phone ? (
            <View style={tw`flex-row items-center mb-3`}>
              <MaterialCommunityIcons name="phone-outline" size={18} color="#6B7280" />
              <Text style={[tw`text-base text-gray-700 ml-3`, typography.body]}>
                {guest.phone}
              </Text>
            </View>
          ) : null}
          {guest.email ? (
            <View style={tw`flex-row items-center`}>
              <MaterialCommunityIcons name="email-outline" size={18} color="#6B7280" />
              <Text style={[tw`text-base text-gray-700 ml-3`, typography.body]}>
                {guest.email}
              </Text>
            </View>
          ) : null}
          {!guest.phone && !guest.email && (
            <Text style={[tw`text-sm text-gray-400`, typography.caption]}>
              No contact information
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={tw`flex-row mb-4`}>
          <View style={tw`flex-1 bg-white rounded-xl border border-gray-100 p-4 mr-2 items-center`}>
            <MaterialCommunityIcons name="calendar-check" size={22} color="#3B82F6" />
            <Text style={[tw`text-xl text-gray-800 mt-1`, typography.h3]}>
              {guest.totalVisits ?? 0}
            </Text>
            <Text style={[tw`text-xs text-gray-400 mt-0.5`, typography.small]}>
              Visits
            </Text>
          </View>
          <View style={tw`flex-1 bg-white rounded-xl border border-gray-100 p-4 mx-1 items-center`}>
            <MaterialCommunityIcons name="currency-usd" size={22} color="#10B981" />
            <Text style={[tw`text-xl text-gray-800 mt-1`, typography.h3]} numberOfLines={1}>
              {formatCurrency(guest.totalSpend ?? 0)}
            </Text>
            <Text style={[tw`text-xs text-gray-400 mt-0.5`, typography.small]}>
              Total Spend
            </Text>
          </View>
          <View style={tw`flex-1 bg-white rounded-xl border border-gray-100 p-4 ml-2 items-center`}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#8B5CF6" />
            <Text style={[tw`text-sm text-gray-800 mt-1`, typography.captionSemibold]} numberOfLines={1}>
              {guest.lastVisitDate ? formatDate(guest.lastVisitDate) : '—'}
            </Text>
            <Text style={[tw`text-xs text-gray-400 mt-0.5`, typography.small]}>
              Last Visit
            </Text>
          </View>
        </View>

        {/* Tags */}
        {regularTags.length > 0 && (
          <View style={tw`bg-white rounded-xl border border-gray-100 p-4 mb-4`}>
            <Text
              style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}
            >
              Tags
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {regularTags.map((tag) => (
                <View
                  key={tag}
                  style={tw`bg-blue-50 rounded-full px-3 py-1 mr-2 mb-2`}
                >
                  <Text style={[tw`text-xs text-blue-700`, typography.captionSemibold]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {guest.notes ? (
          <View style={tw`bg-white rounded-xl border border-gray-100 p-4 mb-4`}>
            <Text
              style={[tw`text-xs text-gray-400 uppercase mb-2`, typography.captionSemibold]}
            >
              Notes
            </Text>
            <Text style={[tw`text-sm text-gray-600 leading-5`, typography.body]}>
              {guest.notes}
            </Text>
          </View>
        ) : null}

        {/* Visit History */}
        <View style={tw`mt-2`}>
          <Text
            style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}
          >
            Visit History
          </Text>
          {history.length > 0 ? (
            history.map((entry) => (
              <View
                key={entry.id}
                style={tw`bg-white rounded-xl border border-gray-100 p-4 mb-2`}
              >
                <View style={tw`flex-row items-center justify-between mb-1`}>
                  <Text style={[tw`text-sm text-gray-800`, typography.captionSemibold]}>
                    {formatDateTime(entry.visitDate)}
                  </Text>
                  {entry.totalAmount != null && (
                    <Text style={[tw`text-sm text-gray-800`, typography.bodySemibold]}>
                      {formatCurrency(entry.totalAmount)}
                    </Text>
                  )}
                </View>
                <View style={tw`flex-row items-center mt-1`}>
                  {entry.checkNumber && (
                    <View style={tw`flex-row items-center mr-4`}>
                      <MaterialCommunityIcons name="receipt" size={14} color="#9CA3AF" />
                      <Text style={[tw`text-xs text-gray-500 ml-1`, typography.small]}>
                        #{entry.checkNumber}
                      </Text>
                    </View>
                  )}
                  {entry.tableName && (
                    <View style={tw`flex-row items-center mr-4`}>
                      <MaterialCommunityIcons name="table-furniture" size={14} color="#9CA3AF" />
                      <Text style={[tw`text-xs text-gray-500 ml-1`, typography.small]}>
                        {entry.tableName}
                      </Text>
                    </View>
                  )}
                  {entry.serverName && (
                    <View style={tw`flex-row items-center`}>
                      <MaterialCommunityIcons name="account-outline" size={14} color="#9CA3AF" />
                      <Text style={[tw`text-xs text-gray-500 ml-1`, typography.small]}>
                        {entry.serverName}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={tw`items-center py-8`}>
              <MaterialCommunityIcons name="history" size={36} color="#D1D5DB" />
              <Text style={[tw`text-gray-400 mt-2`, typography.caption]}>
                No visit history
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
