import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MenuItem } from '@/types/hospitality';
import { getItemCategoryName, hasRequiredModifiers } from '@/types/hospitality';

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

const COURSE_ICONS: Record<string, string> = {
  APPETIZER: 'silverware-fork-knife',
  SOUP: 'bowl-mix',
  SALAD: 'leaf',
  ENTREE: 'food-steak',
  DESSERT: 'cupcake',
  BEVERAGE: 'glass-cocktail',
};

interface MenuItemCardProps {
  item: MenuItem;
  onQuickAdd?: () => void;
  onLongPress?: () => void;
  highlightedName?: { text: string; highlighted: boolean }[];
  compact?: boolean;
}

export function MenuItemCard({
  item,
  onQuickAdd,
  onLongPress,
  highlightedName,
  compact,
}: MenuItemCardProps) {
  const router = useRouter();
  const requiresMods = hasRequiredModifiers(item);
  const catName = getItemCategoryName(item);

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          tw`bg-white rounded-xl p-3.5 border border-gray-100`,
          !item.isAvailable && { opacity: 0.45 },
        ]}
        onPress={() => router.push(`/menu-item/${item.id}`)}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={tw`w-full h-24 rounded-lg bg-gray-100 mb-2.5`}
            resizeMode="cover"
          />
        ) : (
          <View style={tw`w-full h-24 rounded-lg bg-gray-50 items-center justify-center mb-2.5`}>
            <MaterialCommunityIcons
              name={(COURSE_ICONS[item.defaultCourseType ?? ''] ?? 'food-variant') as any}
              size={32}
              color="#D1D5DB"
            />
          </View>
        )}

        {!item.isAvailable && (
          <View style={tw`absolute top-2 right-2 bg-red-500 rounded-full px-2 py-0.5`}>
            <Text style={[tw`text-white`, { fontSize: 11, fontFamily: 'Geist-Bold' }]}>86'd</Text>
          </View>
        )}

        <Text style={[tw`text-gray-900`, typography.bodyMedium]} numberOfLines={2}>
          {item.name}
        </Text>

        {catName && (
          <Text style={[tw`text-gray-400 mt-0.5`, typography.small]} numberOfLines={1}>
            {catName}
          </Text>
        )}

        <View style={tw`flex-row items-center justify-between mt-2.5`}>
          <Text style={[tw`text-blue-600`, typography.bodySemibold]}>
            R{item.price?.toFixed(2)}
          </Text>
          {item.isAvailable && !requiresMods && onQuickAdd ? (
            <TouchableOpacity
              style={tw`w-8 h-8 rounded-full bg-blue-50 items-center justify-center`}
              onPress={(e) => { e.stopPropagation?.(); onQuickAdd(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#2563EB" />
            </TouchableOpacity>
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={18} color="#D1D5DB" />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        tw`bg-white rounded-xl p-4 mb-3 mx-4 border border-gray-100 flex-row items-center`,
        !item.isAvailable && { opacity: 0.45 },
      ]}
      onPress={() => router.push(`/menu-item/${item.id}`)}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={tw`w-16 h-16 rounded-xl bg-gray-100 mr-4`}
          resizeMode="cover"
        />
      ) : (
        <View style={tw`w-16 h-16 rounded-xl bg-gray-50 items-center justify-center mr-4`}>
          <MaterialCommunityIcons
            name={(COURSE_ICONS[item.defaultCourseType ?? ''] ?? 'food-variant') as any}
            size={24}
            color="#D1D5DB"
          />
        </View>
      )}

      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
          <Text style={[tw`flex-1`, typography.bodySemibold]} numberOfLines={1}>
            {highlightedName
              ? highlightedName.map((seg, i) =>
                  seg.highlighted
                    ? <Text key={i} style={tw`text-blue-600 bg-blue-50`}>{seg.text}</Text>
                    : <Text key={i}>{seg.text}</Text>
                )
              : item.name}
          </Text>
          {!item.isAvailable && (
            <View style={tw`bg-red-500 rounded-full px-2 py-0.5 ml-2`}>
              <Text style={[tw`text-white`, { fontSize: 11, fontFamily: 'Geist-Bold' }]}>86'd</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text style={[tw`text-gray-500 mt-0.5`, typography.caption]} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}

        {item.allergens && item.allergens.length > 0 && (
          <View style={tw`flex-row items-center mt-1.5 gap-1`}>
            {item.allergens.slice(0, 5).map((a) => (
              <View
                key={a}
                style={[tw`w-3 h-3 rounded-full`, { backgroundColor: getAllergenColor(a) }]}
              />
            ))}
            <Text style={[tw`text-gray-400 ml-0.5`, typography.small]}>
              {item.allergens.join(', ')}
            </Text>
          </View>
        )}

        {((item.tags?.length ?? 0) > 0 || (item.dietaryFlags?.length ?? 0) > 0) && (
          <View style={tw`flex-row flex-wrap mt-1.5 gap-1`}>
            {item.dietaryFlags?.map((flag) => (
              <View key={flag} style={tw`bg-green-50 rounded-full px-2.5 py-0.5`}>
                <Text style={[tw`text-green-700`, typography.small]}>{flag}</Text>
              </View>
            ))}
            {item.tags?.slice(0, 3).map((tag) => (
              <View key={tag} style={tw`bg-blue-50 rounded-full px-2.5 py-0.5`}>
                <Text style={[tw`text-blue-600`, typography.small]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={tw`flex-row items-center justify-between mt-2`}>
          <Text style={[tw`text-blue-600`, typography.headingSemibold]}>
            R{item.price?.toFixed(2)}
          </Text>
          <View style={tw`flex-row items-center gap-2`}>
            {item.defaultCourseType && (
              <View style={tw`bg-gray-100 rounded-full px-2.5 py-0.5`}>
                <Text style={[tw`text-gray-500`, typography.small]}>
                  {item.defaultCourseType.charAt(0) + item.defaultCourseType.slice(1).toLowerCase()}
                </Text>
              </View>
            )}
            {catName && (
              <View style={tw`bg-gray-100 rounded-full px-2.5 py-0.5`}>
                <Text style={[tw`text-gray-600`, typography.small]}>{catName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {item.isAvailable && !requiresMods && onQuickAdd ? (
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-blue-500 items-center justify-center ml-3`}
          onPress={(e) => { e.stopPropagation?.(); onQuickAdd(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" style={tw`ml-2`} />
      )}
    </TouchableOpacity>
  );
}
