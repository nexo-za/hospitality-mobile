import React from 'react';
import { View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MenuItem } from '@/types/hospitality';

const ALLERGEN_COLORS: Record<string, string> = {
  gluten: '#DC2626',
  dairy: '#2563EB',
  nuts: '#92400E',
  shellfish: '#DB2777',
  soy: '#65A30D',
  eggs: '#EA580C',
  fish: '#0891B2',
  sesame: '#7C3AED',
};

function getAllergenColor(allergen: string): string {
  const key = allergen.toLowerCase();
  for (const [k, color] of Object.entries(ALLERGEN_COLORS)) {
    if (key.includes(k)) return color;
  }
  return '#DC2626';
}

function hasRequiredModifiers(item: MenuItem): boolean {
  return (
    !!item.modifierGroups?.length &&
    item.modifierGroups.some((mg) => mg.isRequired)
  );
}

export function MenuItemCard({
  item,
  onQuickAdd,
}: {
  item: MenuItem;
  onQuickAdd?: () => void;
}) {
  const router = useRouter();
  const requiresModifiers = hasRequiredModifiers(item);
  const { width } = useWindowDimensions();
  
  // Decide columns based on window width (roughly matching tailwind breakpoints)
  // Right panel is fixed 350-400px. Left panel gets the rest.
  const isLarge = width >= 1024;
  const isMedium = width >= 768;
  const numCols = isLarge ? 4 : (isMedium ? 3 : 2);
  
  return (
    <TouchableOpacity
      style={[
        tw`bg-white rounded-xl p-4 mb-2 border border-gray-100 flex-col justify-between shadow-sm min-h-[160px]`,
        !item.isAvailable && { opacity: 0.5 },
      ]}
      onPress={() => router.push(`/menu-item/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row justify-between items-start w-full`}>
        {/* Replace image with placeholder if none exists, keep consistent size */}
        {item.imageUrl ? (
          <View style={tw`w-14 h-14 rounded-xl bg-gray-50 overflow-hidden`}>
             <MaterialCommunityIcons name="image" size={24} color="#9CA3AF" style={tw`m-auto`} />
          </View>
        ) : (
          <View style={tw`w-14 h-14 rounded-xl bg-gray-50 items-center justify-center`}>
            <MaterialCommunityIcons name="food-variant" size={24} color="#9CA3AF" />
          </View>
        )}

        {/* Action Button - Moved to top right, matching Nexo Pro Retail */}
        {item.isAvailable && !requiresModifiers && onQuickAdd ? (
          <TouchableOpacity
            style={tw`w-8 h-8 rounded-full bg-blue-50 items-center justify-center`}
            onPress={(e) => {
              e.stopPropagation?.();
              onQuickAdd();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#2563EB" />
          </TouchableOpacity>
        ) : (
          <View style={tw`w-8 h-8 rounded-full bg-gray-50 items-center justify-center`}>
            <MaterialCommunityIcons name="plus" size={18} color="#9CA3AF" />
          </View>
        )}
      </View>

      <View style={tw`w-full mt-3`}>
        <Text style={[tw`text-sm text-gray-800`, typography.bodySemibold]} numberOfLines={2}>
          {item.name}
        </Text>
        
        {item.description ? (
          <Text style={[tw`text-xs text-gray-400 mt-1`, typography.caption]} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}

        {!item.isAvailable && (
          <View style={tw`bg-red-500 rounded-full px-2 py-0.5 mt-1 self-start`}>
            <Text style={[tw`text-[10px] text-white`, typography.captionSemibold]}>
              86'd
            </Text>
          </View>
        )}

        <Text style={[tw`text-sm text-blue-600 mt-2`, typography.bodySemibold]}>
          R{item.price?.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
