import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useOrder } from '@/contexts/OrderContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import guestsService from '@/api/services/guestsService';
import type { CheckType, GuestProfile } from '@/types/hospitality';

const CHECK_TYPES: { value: CheckType; label: string; icon: string }[] = [
  { value: 'DINE_IN', label: 'Dine In', icon: 'silverware-fork-knife' },
  { value: 'BAR_TAB', label: 'Bar Tab', icon: 'glass-cocktail' },
  { value: 'TAKEOUT', label: 'Takeout', icon: 'shopping-outline' },
  { value: 'DELIVERY', label: 'Delivery', icon: 'moped' },
  { value: 'QUICK_SALE', label: 'Quick Sale', icon: 'flash' },
];

const DIETARY_KEYWORDS = [
  'allergy', 'allergen', 'dietary', 'vegetarian', 'vegan',
  'gluten-free', 'gluten free', 'nut-free', 'nut free',
  'lactose', 'dairy-free', 'dairy free', 'halal', 'kosher',
  'shellfish', 'seafood', 'egg', 'soy', 'wheat', 'celiac',
];

function getDietaryTags(tags?: string[]): string[] {
  if (!tags) return [];
  return tags.filter((t) => {
    const lower = t.toLowerCase();
    return DIETARY_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

export default function NewOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCheck } = useOrder();
  const [checkType, setCheckType] = useState<CheckType>('DINE_IN');
  const [guestCount, setGuestCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<GuestProfile[]>([]);
  const [guestSearching, setGuestSearching] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedDietaryTags = getDietaryTags(selectedGuest?.tags);

  const handleGuestSearch = useCallback((text: string) => {
    setGuestSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setGuestResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setGuestSearching(true);
      try {
        const res = await guestsService.list({ search: text.trim(), limit: 10 });
        setGuestResults(res.data);
      } catch {
        setGuestResults([]);
      } finally {
        setGuestSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectGuest = useCallback((guest: GuestProfile) => {
    setSelectedGuest(guest);
    setGuestSearch('');
    setGuestResults([]);
  }, []);

  const handleClearGuest = useCallback(() => {
    setSelectedGuest(null);
  }, []);

  const handleCreate = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const check = await createCheck({
        storeId: (user as any).storeId,
        checkType,
        guestCount: parseInt(guestCount, 10) || 1,
        notes: notes || undefined,
        guestProfileId: selectedGuest?.id,
      });
      router.replace(`/order/${check.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View
        style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3`, typography.headingSemibold]}>
          New Order
        </Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-8`} keyboardShouldPersistTaps="handled">
        {/* Order Type */}
        <Text
          style={[
            tw`text-xs text-gray-400 uppercase mb-2`,
            typography.captionSemibold,
          ]}
        >
          Order Type
        </Text>
        <View style={tw`flex-row flex-wrap mb-6`}>
          {CHECK_TYPES.map((ct) => (
            <TouchableOpacity
              key={ct.value}
              style={tw`w-[30%] m-[1.5%] bg-white rounded-xl py-4 items-center border-2 ${
                checkType === ct.value ? 'border-blue-500' : 'border-gray-100'
              }`}
              onPress={() => setCheckType(ct.value)}
            >
              <MaterialCommunityIcons
                name={ct.icon as any}
                size={28}
                color={checkType === ct.value ? '#3B82F6' : '#9CA3AF'}
              />
              <Text
                style={[
                  tw`text-sm mt-2 ${
                    checkType === ct.value ? 'text-blue-600' : 'text-gray-600'
                  }`,
                  typography.bodySemibold,
                ]}
              >
                {ct.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Link Guest */}
        <Text
          style={[
            tw`text-xs text-gray-400 uppercase mb-2`,
            typography.captionSemibold,
          ]}
        >
          Link Guest
        </Text>
        <View style={tw`bg-white rounded-xl border border-gray-200 mb-2`}>
          {selectedGuest ? (
            <View style={tw`flex-row items-center p-3`}>
              <View style={tw`w-9 h-9 rounded-full bg-blue-50 items-center justify-center mr-3`}>
                <Text style={[tw`text-blue-600 text-sm`, typography.captionSemibold]}>
                  {(selectedGuest.firstName?.[0] ?? '').toUpperCase()}
                  {(selectedGuest.lastName?.[0] ?? '').toUpperCase()}
                </Text>
              </View>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={[tw`text-base text-gray-800`, typography.bodySemibold]}>
                    {selectedGuest.firstName} {selectedGuest.lastName}
                  </Text>
                  {selectedGuest.isVIP && (
                    <View style={tw`bg-yellow-100 rounded-full px-2 py-0.5 ml-2`}>
                      <Text style={[tw`text-yellow-700`, { fontSize: 10, fontFamily: 'Geist-Bold' }]}>
                        VIP
                      </Text>
                    </View>
                  )}
                </View>
                {selectedGuest.phone && (
                  <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                    {selectedGuest.phone}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleClearGuest}
                style={tw`p-2`}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw`flex-row items-center px-3`}>
              <MaterialCommunityIcons name="account-search-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={tw`flex-1 py-3 px-2 text-base`}
                placeholder="Search guest by name or phone..."
                value={guestSearch}
                onChangeText={handleGuestSearch}
                returnKeyType="search"
              />
              {guestSearching && (
                <ActivityIndicator size="small" color="#9CA3AF" />
              )}
            </View>
          )}
        </View>

        {/* Search Results */}
        {guestResults.length > 0 && !selectedGuest && (
          <View style={tw`bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden`}>
            {guestResults.map((g, idx) => (
              <TouchableOpacity
                key={g.id}
                style={tw`flex-row items-center p-3 ${
                  idx < guestResults.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onPress={() => handleSelectGuest(g)}
                activeOpacity={0.7}
              >
                <View style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3`}>
                  <Text style={[tw`text-gray-600 text-xs`, typography.captionSemibold]}>
                    {(g.firstName?.[0] ?? '').toUpperCase()}
                    {(g.lastName?.[0] ?? '').toUpperCase()}
                  </Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-sm text-gray-800`, typography.captionSemibold]}>
                    {g.firstName} {g.lastName}
                  </Text>
                  {g.phone && (
                    <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                      {g.phone}
                    </Text>
                  )}
                </View>
                {g.isVIP && (
                  <View style={tw`bg-yellow-100 rounded-full px-2 py-0.5`}>
                    <Text style={[tw`text-yellow-700`, { fontSize: 10, fontFamily: 'Geist-Bold' }]}>
                      VIP
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!selectedGuest && guestResults.length === 0 && (
          <View style={tw`mb-4`} />
        )}

        {/* Allergy Warning */}
        {selectedGuest && selectedDietaryTags.length > 0 && (
          <View style={tw`bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex-row items-start`}>
            <MaterialCommunityIcons name="alert" size={18} color="#EA580C" style={tw`mt-0.5`} />
            <View style={tw`flex-1 ml-2`}>
              <Text style={[tw`text-sm text-orange-800`, typography.captionSemibold]}>
                Guest Dietary Alert
              </Text>
              <View style={tw`flex-row flex-wrap mt-1`}>
                {selectedDietaryTags.map((tag) => (
                  <View
                    key={tag}
                    style={tw`bg-orange-100 border border-orange-300 rounded-full px-2 py-0.5 mr-1.5 mb-1`}
                  >
                    <Text style={[tw`text-orange-800`, { fontSize: 11, fontFamily: 'Geist-SemiBold' }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Guest Count */}
        <Text
          style={[
            tw`text-xs text-gray-400 uppercase mb-2`,
            typography.captionSemibold,
          ]}
        >
          Guest Count
        </Text>
        <View
          style={tw`bg-white rounded-xl border border-gray-200 px-4 mb-6`}
        >
          <TextInput
            style={tw`py-3 text-base`}
            value={guestCount}
            onChangeText={setGuestCount}
            keyboardType="number-pad"
            placeholder="1"
          />
        </View>

        {/* Notes */}
        <Text
          style={[
            tw`text-xs text-gray-400 uppercase mb-2`,
            typography.captionSemibold,
          ]}
        >
          Notes (optional)
        </Text>
        <View
          style={tw`bg-white rounded-xl border border-gray-200 px-4 mb-6`}
        >
          <TextInput
            style={tw`py-3 text-base min-h-[80px]`}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Special requests..."
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-xl py-4 items-center ${
            submitting ? 'opacity-50' : ''
          }`}
          onPress={handleCreate}
          disabled={submitting}
        >
          <Text
            style={[tw`text-white text-base`, typography.bodySemibold]}
          >
            {submitting ? 'Creating...' : 'Create Order'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
