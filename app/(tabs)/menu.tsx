import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import { useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMenuSearch, getHighlightSegments } from '@/hooks/useMenuSearch';
import type { MenuItem } from '@/types/hospitality';
import { getItemCategoryName } from '@/types/hospitality';

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

type ViewMode = 'grid' | 'list';

export default function MenuScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const productColumns = width >= 1024 ? 'w-1/4' : width >= 768 ? 'w-1/3' : 'w-1/2';
  const searchInputRef = useRef<TextInput>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const {
    menus,
    selectedMenu,
    menuItems,
    isLoading,
    error,
    selectMenu,
    refreshMenus,
    toggleAvailability,
  } = useMenu();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    query: localSearch,
    setQuery: setLocalSearch,
    debouncedQuery,
    filteredItems,
    highlightMap,
  } = useMenuSearch(menuItems, selectedCategory);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item) => {
      const catName = getItemCategoryName(item);
      if (catName) cats.add(catName);
    });
    return [
      { id: 'all', name: 'All', icon: 'grid' as const },
      ...Array.from(cats)
        .sort()
        .map((c) => ({ id: c, name: c, icon: 'silverware-fork-knife' as const })),
    ];
  }, [menuItems]);

  const unavailableCount = menuItems.filter((i) => !i.isAvailable).length;

  useEffect(() => {
    if (user) {
      refreshMenus((user as any).storeId);
    }
  }, [user, refreshMenus]);

  // Load full menu when selection changes (set by refreshMenus auto-select)
  useEffect(() => {
    if (selectedMenu) {
      selectMenu(selectedMenu);
    }
  }, [selectedMenu?.id]);

  // Refresh data when tab regains focus
  useFocusEffect(
    useCallback(() => {
      if (user && selectedMenu) {
        refreshMenus((user as any).storeId);
      }
    }, [user, selectedMenu?.id, refreshMenus])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMenus((user as any)?.storeId);
      if (selectedMenu) await selectMenu(selectedMenu);
    } finally {
      setRefreshing(false);
    }
  }, [refreshMenus, selectMenu, selectedMenu, user]);

  const handleToggleAvailability = useCallback(
    (item: MenuItem) => {
      const action = item.isAvailable ? '86 (mark unavailable)' : 'Un-86 (mark available)';
      Alert.alert(
        action,
        `"${item.name}" will be ${item.isAvailable ? 'removed from' : 'added back to'} the active menu.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await toggleAvailability(item.id);
              } catch {
                Alert.alert('Error', 'Failed to update availability');
              }
            },
          },
        ],
      );
    },
    [toggleAvailability],
  );

  const renderHighlightedText = useCallback(
    (text: string, field: string, itemId: number, style: any) => {
      const matches = highlightMap.get(itemId);
      const match = matches?.find((h) => h.field === field);
      if (!match) return <Text style={style} numberOfLines={1}>{text}</Text>;
      const segments = getHighlightSegments(text, match.indices);
      return (
        <Text style={style} numberOfLines={1}>
          {segments.map((seg, i) =>
            seg.highlighted ? (
              <Text key={i} style={tw`text-blue-600 bg-blue-50`}>{seg.text}</Text>
            ) : (
              <Text key={i}>{seg.text}</Text>
            ),
          )}
        </Text>
      );
    },
    [highlightMap],
  );

  const renderGridItem = useCallback(
    (item: MenuItem, index: number) => {
      const catName = getItemCategoryName(item);
      const catColor = getCategoryColor(catName);

      return (
        <TouchableOpacity
          key={`menu-${item.id}-${index}`}
          style={[tw`p-2 ${!item.isAvailable ? 'opacity-40' : ''} ${productColumns}`]}
          onPress={() => router.push(`/menu-item/${item.id}`)}
          onLongPress={() => handleToggleAvailability(item)}
          activeOpacity={0.7}
        >
          <View style={tw`bg-white rounded-xl p-3 border border-gray-100 overflow-hidden`}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={tw`w-full h-20 rounded-lg bg-gray-50 mb-2`}
                resizeMode="cover"
              />
            ) : (
              <View style={tw`flex-row items-start`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-lg items-center justify-center mr-2.5`,
                    { backgroundColor: `${catColor}15` },
                  ]}
                >
                  <MaterialCommunityIcons name="food-variant" size={20} color={catColor} />
                </View>
                <View style={tw`flex-1`}>
                  {renderHighlightedText(
                    item.name,
                    'name',
                    item.id,
                    [tw`text-gray-900`, typography.bodyMedium],
                  )}
                  {catName && (
                    <Text style={[tw`text-gray-400 mt-0.5`, typography.small]} numberOfLines={1}>{catName}</Text>
                  )}
                </View>
              </View>
            )}
            {item.imageUrl && (
              <View>
                {renderHighlightedText(
                  item.name,
                  'name',
                  item.id,
                  [tw`text-gray-900`, typography.bodyMedium],
                )}
              </View>
            )}
            {!item.isAvailable && (
              <View style={tw`absolute top-2 right-2 bg-red-500 rounded-full px-2 py-0.5`}>
                <Text style={[tw`text-white`, { fontSize: 10, fontFamily: 'Geist-Bold' }]}>86'd</Text>
              </View>
            )}
            <View style={tw`flex-row items-center justify-between mt-2.5`}>
              <Text variant="semibold" style={[tw`text-gray-900`, typography.bodySemibold]}>
                R{item.price?.toFixed(2)}
              </Text>
              <View style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: `${catColor}15` }]}>
                <MaterialCommunityIcons name="chevron-right" size={18} color={catColor} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [productColumns, handleToggleAvailability, renderHighlightedText, router],
  );

  const renderListItem = useCallback(
    (item: MenuItem, index: number) => {
      const catName = getItemCategoryName(item);
      const catColor = getCategoryColor(catName);

      return (
        <TouchableOpacity
          key={`menu-list-${item.id}-${index}`}
          style={[tw`px-4 py-3 border-b border-gray-50 flex-row items-center`, !item.isAvailable && tw`opacity-40`]}
          onPress={() => router.push(`/menu-item/${item.id}`)}
          onLongPress={() => handleToggleAvailability(item)}
          activeOpacity={0.6}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={tw`w-12 h-12 rounded-lg bg-gray-50 mr-3`}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                tw`w-10 h-10 rounded-lg items-center justify-center mr-3`,
                { backgroundColor: `${catColor}15` },
              ]}
            >
              <MaterialCommunityIcons name="food-variant" size={20} color={catColor} />
            </View>
          )}
          <View style={tw`flex-1 mr-3`}>
            {renderHighlightedText(
              item.name,
              'name',
              item.id,
              [tw`text-gray-900`, typography.bodyMedium],
            )}
            {catName && (
              <Text style={[tw`text-gray-400 mt-0.5`, typography.small]} numberOfLines={1}>{catName}</Text>
            )}
          </View>
          {!item.isAvailable && (
            <View style={tw`bg-red-500 rounded-full px-2 py-0.5 mr-3`}>
              <Text style={[tw`text-white`, { fontSize: 10, fontFamily: 'Geist-Bold' }]}>86'd</Text>
            </View>
          )}
          <Text variant="semibold" style={[tw`text-gray-900 mr-3`, typography.bodySemibold]}>
            R{item.price?.toFixed(2)}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#D1D5DB" />
        </TouchableOpacity>
      );
    },
    [handleToggleAvailability, renderHighlightedText, router],
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[tw`text-gray-500 mt-3`, typography.body]}>Loading menu...</Text>
        </View>
      );
    }

    return (
      <View style={tw`flex-1 justify-center items-center p-6`}>
        <MaterialCommunityIcons name="food-off" size={48} color="#D1D5DB" />
        <Text variant="semibold" style={[tw`text-gray-700 text-center mb-1 mt-3`, typography.headingSemibold]}>
          No Items Found
        </Text>
        <Text style={[tw`text-gray-400 text-center mb-4`, typography.body]}>
          {selectedCategory !== 'all'
            ? `No items in "${selectedCategory}".`
            : debouncedQuery
              ? `No items matching "${debouncedQuery}".`
              : 'No menu items available.'}
        </Text>
        {(selectedCategory !== 'all' || localSearch) && (
          <TouchableOpacity
            style={tw`bg-gray-100 rounded-xl py-3 px-5`}
            onPress={() => { setSelectedCategory('all'); setLocalSearch(''); }}
          >
            <Text variant="medium" style={[tw`text-gray-600`, typography.bodyMedium]}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Search Header */}
      <View style={tw`flex-row items-center bg-white px-4 py-3 border-b border-gray-100`}>
        <TouchableOpacity
          style={tw`flex-1 flex-row items-center bg-gray-50 rounded-xl px-4 py-2`}
          activeOpacity={0.7}
          onPress={() => searchInputRef.current?.focus()}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            ref={searchInputRef}
            style={[tw`flex-1 ml-2 text-gray-900 py-2`, typography.body]}
            placeholder="Search menu items..."
            placeholderTextColor="#9CA3AF"
            value={localSearch}
            onChangeText={setLocalSearch}
          />
          {localSearch.length > 0 && (
            <TouchableOpacity onPress={() => setLocalSearch('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <MaterialCommunityIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`ml-3 p-2.5 rounded-lg ${viewMode === 'list' ? 'bg-blue-50' : 'bg-gray-50'}`}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'format-list-bulleted' : 'grid'}
            size={20}
            color={viewMode === 'list' ? colors.primary.main : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={tw`h-14 bg-white border-b border-gray-100`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`px-4`} contentContainerStyle={tw`h-14 items-center`}>
          {categories.map((cat, idx) => (
            <TouchableOpacity
              key={`cat-${cat.id}-${idx}`}
              style={tw`mr-2 px-4 py-2 rounded-full ${selectedCategory === cat.id ? 'bg-blue-600' : 'bg-gray-50'}`}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={16}
                  color={selectedCategory === cat.id ? '#fff' : '#9CA3AF'}
                />
                <Text style={[
                  tw`ml-1.5 ${selectedCategory === cat.id ? 'text-white' : 'text-gray-600'}`,
                  typography.captionSemibold,
                ]}>
                  {cat.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 86 count banner */}
      {unavailableCount > 0 && (
        <View style={tw`bg-red-50 px-4 py-2 flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center`}>
            <MaterialCommunityIcons name="food-off" size={16} color="#DC2626" />
            <Text style={[tw`text-red-700 ml-1.5`, typography.captionSemibold]}>
              {unavailableCount} item{unavailableCount > 1 ? 's' : ''} 86'd
            </Text>
          </View>
          <Text style={[tw`text-red-400`, typography.small]}>Long-press to toggle</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={tw`bg-red-50 p-3 mx-4 mt-2 rounded-lg`}>
          <Text style={[tw`text-red-700`, typography.caption]}>{error}</Text>
        </View>
      )}

      {/* Menu Content */}
      {filteredItems.length === 0 ? (
        renderEmpty()
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-16`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {viewMode === 'grid' ? (
            <View style={tw`flex-row flex-wrap px-2 pt-2`}>
              {filteredItems.map((item, index) => renderGridItem(item, index))}
            </View>
          ) : (
            <View style={tw`pt-1`}>
              {filteredItems.map((item, index) => renderListItem(item, index))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
