import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useMenu } from '@/contexts/MenuContext';
import { useOrder } from '@/contexts/OrderContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMenuSearch, getHighlightSegments } from '@/hooks/useMenuSearch';
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

function MenuItemCard({
  item,
  onQuickAdd,
  highlights,
}: {
  item: MenuItem;
  onQuickAdd?: () => void;
  highlights?: ReturnType<typeof getHighlightSegments> extends infer R ? { name?: R; category?: R } : never;
}) {
  const router = useRouter();
  const requiresModifiers = hasRequiredModifiers(item);

  return (
    <TouchableOpacity
      style={[
        tw`bg-white rounded-xl p-4 mb-3 mx-4 border border-gray-100 flex-row items-center`,
        !item.isAvailable && { opacity: 0.5 },
      ]}
      onPress={() => router.push(`/menu-item/${item.id}`)}
      activeOpacity={0.7}
    >
      <View
        style={tw`w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3`}
      >
        {item.imageUrl ? (
          <MaterialCommunityIcons name="image" size={20} color="#9CA3AF" />
        ) : (
          <MaterialCommunityIcons
            name="food-variant"
            size={20}
            color="#9CA3AF"
          />
        )}
      </View>

      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
          <Text style={[tw`text-base flex-1`, typography.bodySemibold]}>
            {highlights?.name
              ? highlights.name.map((seg, i) =>
                  seg.highlighted
                    ? <Text key={i} style={tw`text-blue-600 bg-blue-50`}>{seg.text}</Text>
                    : <Text key={i}>{seg.text}</Text>
                )
              : item.name}
          </Text>
          {!item.isAvailable && (
            <View style={tw`bg-red-500 rounded-full px-2 py-0.5 ml-2`}>
              <Text
                style={[tw`text-xs text-white`, typography.captionSemibold]}
              >
                86'd
              </Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text
            style={[tw`text-sm text-gray-500 mt-0.5`, typography.body]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Allergen dots */}
        {item.allergens && item.allergens.length > 0 && (
          <View style={tw`flex-row items-center mt-1.5 gap-1`}>
            {item.allergens.map((a) => (
              <View
                key={a}
                style={[
                  tw`w-2.5 h-2.5 rounded-full mr-1`,
                  { backgroundColor: getAllergenColor(a) },
                ]}
              />
            ))}
            <Text style={[tw`text-xs text-gray-400 ml-0.5`, typography.caption]}>
              {item.allergens.join(', ')}
            </Text>
          </View>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={tw`flex-row flex-wrap mt-1.5 gap-1`}>
            {item.tags.map((tag) => (
              <View key={tag} style={tw`bg-blue-50 rounded-full px-2 py-0.5`}>
                <Text
                  style={[tw`text-xs text-blue-600`, typography.caption]}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={tw`flex-row items-center justify-between mt-2`}>
          <Text
            style={[tw`text-base text-blue-600`, typography.headingSemibold]}
          >
            R{item.price?.toFixed(2)}
          </Text>
          {item.categoryName && (
            <View style={tw`bg-gray-100 rounded-full px-2 py-0.5`}>
              <Text style={[tw`text-xs text-gray-600`, typography.caption]}>
                {highlights?.category
                  ? highlights.category.map((seg, i) =>
                      seg.highlighted
                        ? <Text key={i} style={tw`text-blue-600 bg-blue-50`}>{seg.text}</Text>
                        : <Text key={i}>{seg.text}</Text>
                    )
                  : item.categoryName}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick-add or chevron */}
      {item.isAvailable && !requiresModifiers && onQuickAdd ? (
        <TouchableOpacity
          style={tw`w-9 h-9 rounded-full bg-blue-500 items-center justify-center ml-3`}
          onPress={(e) => {
            e.stopPropagation?.();
            onQuickAdd();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#D1D5DB"
          style={tw`ml-2`}
        />
      )}
    </TouchableOpacity>
  );
}

function CategoryTabs({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`px-4 py-2`}
    >
      {categories.map((cat) => {
        const active = cat === selected;
        return (
          <TouchableOpacity
            key={cat}
            style={[
              tw`rounded-full px-4 py-2 mr-2 border`,
              active
                ? tw`bg-blue-500 border-blue-500`
                : tw`bg-white border-gray-200`,
            ]}
            onPress={() => onSelect(cat)}
          >
            <Text
              style={[
                tw`text-sm`,
                active ? tw`text-white` : tw`text-gray-600`,
                typography.bodySemibold,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function MenuScreen() {
  const { user } = useAuth();
  const {
    menuItems,
    isLoading,
    error,
    loadMenuItems,
    refreshMenus,
  } = useMenu();
  const { currentCheck, addItem } = useOrder();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const {
    query: localSearch,
    setQuery: setLocalSearch,
    filteredItems,
    highlightMap,
  } = useMenuSearch(menuItems, selectedCategory);

  useEffect(() => {
    if (user) {
      refreshMenus((user as any).storeId);
      loadMenuItems({ availableOnly: false });
    }
  }, [user]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item) => {
      if (item.categoryName) cats.add(item.categoryName);
    });
    return ['All', ...Array.from(cats).sort()];
  }, [menuItems]);

  const onRefresh = useCallback(() => {
    loadMenuItems({ availableOnly: false });
  }, [loadMenuItems]);

  const handleQuickAdd = useCallback(
    async (item: MenuItem) => {
      if (!currentCheck) return;
      try {
        await addItem(currentCheck.id, {
          menuItemId: item.id,
          quantity: 1,
        });
      } catch {
        // silently fail — detail screen can handle errors
      }
    },
    [currentCheck, addItem],
  );

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <View style={tw`px-4 pt-4 pb-1`}>
        <Text style={[tw`text-lg mb-3`, typography.headingSemibold]}>
          Menu
        </Text>
        <View
          style={tw`flex-row bg-white border border-gray-200 rounded-xl px-3 items-center`}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            style={tw`flex-1 py-3 px-2 text-base`}
            placeholder="Search menu items..."
            value={localSearch}
            onChangeText={setLocalSearch}
            returnKeyType="search"
          />
          {localSearch.length > 0 && (
            <TouchableOpacity onPress={() => setLocalSearch('')}>
              <MaterialCommunityIcons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <CategoryTabs
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {error && (
        <View style={tw`bg-red-50 p-3 rounded-lg mb-2 mx-4`}>
          <Text style={[tw`text-red-700 text-sm`, typography.body]}>
            {error}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const hl = highlightMap.get(item.id);
          const nameHL = hl?.find((h) => h.field === 'name');
          const catHL = hl?.find((h) => h.field === 'categoryName');
          return (
            <MenuItemCard
              item={item}
              onQuickAdd={currentCheck ? () => handleQuickAdd(item) : undefined}
              highlights={
                nameHL || catHL
                  ? {
                      name: nameHL ? getHighlightSegments(item.name, nameHL.indices) : undefined,
                      category: catHL && item.categoryName ? getHighlightSegments(item.categoryName, catHL.indices) : undefined,
                    }
                  : undefined
              }
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        contentContainerStyle={tw`pb-8 pt-1`}
        ListEmptyComponent={
          !isLoading ? (
            <View style={tw`items-center justify-center py-16`}>
              <MaterialCommunityIcons
                name="food-off"
                size={48}
                color="#9CA3AF"
              />
              <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
                No menu items found
              </Text>
            </View>
          ) : (
            <View style={tw`items-center py-16`}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )
        }
      />
    </View>
  );
}
