import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useGuests } from '@/contexts/GuestsContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GuestProfile } from '@/types/hospitality';

export default function GuestsScreen() {
  const router = useRouter();
  const { guests, isLoading, loadGuests } = useGuests();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadGuests();
  }, []);

  const handleSearch = useCallback(() => {
    loadGuests({ search });
  }, [search, loadGuests]);

  const renderGuest = useCallback(
    ({ item }: { item: GuestProfile }) => (
      <TouchableOpacity
        style={tw`bg-white p-4 mx-4 mb-2 rounded-xl border border-gray-100`}
        onPress={() => router.push(`/more/guests/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3`}>
            <Text style={[tw`text-blue-600 text-base`, typography.bodySemibold]}>
              {(item.firstName?.[0] ?? '').toUpperCase()}
              {(item.lastName?.[0] ?? '').toUpperCase()}
            </Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-base`, typography.bodySemibold]}>
              {item.firstName} {item.lastName}
            </Text>
            {item.phone && (
              <Text style={[tw`text-sm text-gray-500 mt-0.5`, typography.caption]}>
                {item.phone}
              </Text>
            )}
            {item.email && (
              <Text style={[tw`text-sm text-gray-400`, typography.small]}>
                {item.email}
              </Text>
            )}
          </View>
          {item.isVIP && (
            <View style={tw`bg-yellow-100 rounded-full px-2.5 py-0.5`}>
              <Text style={[tw`text-xs text-yellow-700`, typography.captionSemibold]}>
                VIP
              </Text>
            </View>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#9CA3AF"
            style={tw`ml-2`}
          />
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3`, typography.headingSemibold]}>
          Guests
        </Text>
      </View>

      <View style={tw`px-4 py-2`}>
        <View style={tw`flex-row bg-white border border-gray-200 rounded-xl px-3 items-center`}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            style={tw`flex-1 py-3 px-2 text-base`}
            placeholder="Search guests..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadGuests(); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={guests}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderGuest}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => loadGuests()} />
        }
        contentContainerStyle={tw`pb-8 pt-2`}
        ListEmptyComponent={
          !isLoading ? (
            <View style={tw`items-center py-16`}>
              <MaterialCommunityIcons name="account-group" size={48} color="#9CA3AF" />
              <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
                No guests found
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
