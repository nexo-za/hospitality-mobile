import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import { useMenu } from '@/contexts/MenuContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AllergenChips } from '@/components/menu/AllergenChips';
import type { MenuItem } from '@/types/hospitality';
import { getItemCategoryName, getItemModifierGroups } from '@/types/hospitality';

const CATEGORY_COLORS: Record<string, string> = {
  Starters: '#F59E0B',
  Mains: '#EF4444',
  Desserts: '#EC4899',
  Drinks: '#3B82F6',
  Wine: '#8B5CF6',
  Beverages: '#06B6D4',
  Sides: '#10B981',
};

function getCategoryColor(name?: string): string {
  if (!name) return colors.primary.main;
  return CATEGORY_COLORS[name] || colors.primary.main;
}

export default function MenuItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getMenuItem, toggleAvailability } = useMenu();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    setLoading(true);
    try {
      const data = await getMenuItem(Number(id));
      setItem(data);
    } catch {
      Alert.alert('Error', 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const modifierGroups = useMemo(() => {
    if (!item) return [];
    return getItemModifierGroups(item);
  }, [item]);

  const activeVariants = useMemo(() => {
    return (item?.variants ?? []).filter((v) => v.isActive);
  }, [item]);

  const handleToggleAvailability = useCallback(async () => {
    if (!item) return;
    setToggling(true);
    try {
      await toggleAvailability(item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setItem((prev) => prev ? { ...prev, isAvailable: !prev.isAvailable } : prev);
    } catch {
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setToggling(false);
    }
  }, [item, toggleAvailability]);

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Text style={[tw`text-center mt-10 text-gray-500`, typography.body]}>Item not found</Text>
      </SafeAreaView>
    );
  }

  const catName = getItemCategoryName(item);
  const catColor = getCategoryColor(catName);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['bottom']}>
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`p-1 mr-3`}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`flex-1 text-gray-900`, typography.headingSemibold]} numberOfLines={1}>
          Item Details
        </Text>
      </View>

      <ScrollView contentContainerStyle={tw`pb-8`}>
        {/* Hero section */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={tw`w-full h-48 bg-gray-100`}
            resizeMode="cover"
          />
        ) : (
          <View style={[tw`w-full h-32 items-center justify-center`, { backgroundColor: `${catColor}10` }]}>
            <MaterialCommunityIcons name="food-variant" size={48} color={catColor} />
          </View>
        )}

        {/* Main info card */}
        <View style={tw`bg-white px-4 py-4`}>
          <View style={tw`flex-row items-start justify-between`}>
            <View style={tw`flex-1 mr-3`}>
              <Text style={[tw`text-xl text-gray-900`, typography.h3]}>
                {item.name}
              </Text>
              {item.displayName && item.displayName !== item.name && (
                <Text style={[tw`text-gray-400 mt-0.5`, typography.caption]}>
                  {item.displayName}
                </Text>
              )}
            </View>
            <Text style={[tw`text-2xl`, { color: catColor }, typography.h2]}>
              R{item.price?.toFixed(2)}
            </Text>
          </View>

          {item.description && (
            <Text style={[tw`text-gray-500 mt-3`, typography.body]}>
              {item.description}
            </Text>
          )}

          {/* Badges */}
          <View style={tw`flex-row flex-wrap items-center gap-2 mt-3`}>
            {catName && (
              <View style={[tw`rounded-full px-3 py-1`, { backgroundColor: `${catColor}15` }]}>
                <Text style={[{ color: catColor }, typography.captionSemibold]}>{catName}</Text>
              </View>
            )}
            {item.defaultCourseType && (
              <View style={tw`bg-gray-100 rounded-full px-3 py-1`}>
                <Text style={[tw`text-gray-600`, typography.captionSemibold]}>
                  {item.defaultCourseType.charAt(0) + item.defaultCourseType.slice(1).toLowerCase()}
                </Text>
              </View>
            )}
            {item.sku && (
              <View style={tw`bg-gray-50 rounded-full px-3 py-1`}>
                <Text style={[tw`text-gray-400`, typography.caption]}>SKU: {item.sku}</Text>
              </View>
            )}
          </View>

          {/* Meta: prep time, calories */}
          {(item.prepTimeMinutes != null || item.calories != null) && (
            <View style={tw`flex-row items-center gap-5 mt-4`}>
              {item.prepTimeMinutes != null && (
                <View style={tw`flex-row items-center`}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#9CA3AF" />
                  <Text style={[tw`text-gray-500 ml-1.5`, typography.caption]}>
                    ~{item.prepTimeMinutes} min prep
                  </Text>
                </View>
              )}
              {item.calories != null && (
                <View style={tw`flex-row items-center`}>
                  <MaterialCommunityIcons name="fire" size={16} color="#9CA3AF" />
                  <Text style={[tw`text-gray-500 ml-1.5`, typography.caption]}>
                    {item.calories} cal
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Allergens & dietary */}
          {((item.allergens?.length ?? 0) > 0 || (item.dietaryFlags?.length ?? 0) > 0) && (
            <View style={tw`mt-4`}>
              <AllergenChips allergens={item.allergens} dietaryFlags={item.dietaryFlags} />
            </View>
          )}
        </View>

        {/* Availability toggle */}
        <View style={tw`bg-white mt-3 mx-4 rounded-xl px-4 py-4 flex-row items-center justify-between border border-gray-100`}>
          <View style={tw`flex-row items-center flex-1`}>
            <MaterialCommunityIcons
              name={item.isAvailable ? 'check-circle' : 'close-circle'}
              size={22}
              color={item.isAvailable ? '#16A34A' : '#DC2626'}
            />
            <View style={tw`ml-3`}>
              <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                {item.isAvailable ? 'Available' : "86'd (Unavailable)"}
              </Text>
              <Text style={[tw`text-gray-400 mt-0.5`, typography.small]}>
                {item.isAvailable ? 'Showing on active menus' : 'Hidden from ordering'}
              </Text>
            </View>
          </View>
          <Switch
            value={item.isAvailable}
            onValueChange={handleToggleAvailability}
            disabled={toggling}
            trackColor={{ false: '#FCA5A5', true: '#86EFAC' }}
            thumbColor={item.isAvailable ? '#16A34A' : '#DC2626'}
          />
        </View>

        {/* Variants (read-only reference) */}
        {activeVariants.length > 0 && (
          <View style={tw`mt-3`}>
            <View style={tw`flex-row items-center px-4 mb-2`}>
              <MaterialCommunityIcons name="format-list-bulleted-type" size={16} color="#9CA3AF" />
              <Text style={[tw`text-gray-400 ml-1.5 uppercase`, typography.smallMedium]}>
                Variants ({activeVariants.length})
              </Text>
            </View>
            <View style={tw`bg-white rounded-xl mx-4 overflow-hidden border border-gray-100`}>
              {activeVariants.map((variant, idx) => (
                <View
                  key={variant.id}
                  style={[
                    tw`flex-row items-center px-4 py-3`,
                    idx < activeVariants.length - 1 && tw`border-b border-gray-50`,
                  ]}
                >
                  <Text style={[tw`flex-1 text-gray-900`, typography.body]}>{variant.name}</Text>
                  <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                    R{variant.price?.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Modifier Groups (read-only reference) */}
        {modifierGroups.length > 0 && (
          <View style={tw`mt-3`}>
            <View style={tw`flex-row items-center px-4 mb-2`}>
              <MaterialCommunityIcons name="tune-variant" size={16} color="#9CA3AF" />
              <Text style={[tw`text-gray-400 ml-1.5 uppercase`, typography.smallMedium]}>
                Modifier Groups ({modifierGroups.length})
              </Text>
            </View>
            {modifierGroups.map((group) => (
              <View key={group.id} style={tw`bg-white rounded-xl mx-4 mb-2 overflow-hidden border border-gray-100`}>
                <View style={tw`px-4 py-3 bg-gray-50 border-b border-gray-100`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                      {group.displayName || group.name}
                    </Text>
                    <View style={tw`flex-row items-center gap-1.5`}>
                      {group.isRequired && (
                        <View style={tw`bg-red-50 rounded-full px-2 py-0.5`}>
                          <Text style={[tw`text-red-600`, { fontSize: 10, fontFamily: 'Geist-SemiBold' }]}>Required</Text>
                        </View>
                      )}
                      <View style={tw`bg-gray-100 rounded-full px-2 py-0.5`}>
                        <Text style={[tw`text-gray-500`, { fontSize: 10, fontFamily: 'Geist-Medium' }]}>
                          {group.selectionType === 'SINGLE' ? 'Pick 1' : `Up to ${group.maxSelections ?? '∞'}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {group.modifiers.filter((m) => m.isActive).map((mod, idx, arr) => (
                  <View
                    key={mod.id}
                    style={[
                      tw`flex-row items-center px-4 py-2.5`,
                      idx < arr.length - 1 && tw`border-b border-gray-50`,
                    ]}
                  >
                    <Text style={[tw`flex-1 text-gray-700`, typography.caption]}>{mod.name}</Text>
                    {mod.isDefault && (
                      <View style={tw`bg-blue-50 rounded-full px-2 py-0.5 mr-2`}>
                        <Text style={[tw`text-blue-600`, { fontSize: 10, fontFamily: 'Geist-Medium' }]}>Default</Text>
                      </View>
                    )}
                    <Text style={[tw`text-gray-500`, typography.caption]}>
                      {mod.priceAdjustment === 0 ? 'Included' : `${mod.priceAdjustment > 0 ? '+' : ''}R${mod.priceAdjustment.toFixed(2)}`}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
