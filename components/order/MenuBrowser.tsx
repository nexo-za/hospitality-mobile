import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import type { MenuItem } from '@/types/hospitality';
import { getItemCategoryName, hasRequiredModifiers } from '@/types/hospitality';

type ViewMode = 'grid' | 'list';

interface HighlightMatch {
  field: string;
  indices: ReadonlyArray<[number, number]>;
}

interface MenuBrowserProps {
  menuItems: MenuItem[];
  filteredItems: MenuItem[];
  menuLoading: boolean;
  categories: { id: string; name: string; icon: string }[];
  selectedCategory: string;
  searchQuery: string;
  debouncedQuery: string;
  highlightMap: Map<number, HighlightMatch[]>;
  recentItemIds: number[];
  isOpen: boolean;
  productColumns: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  onReloadMenu: () => void;
  onBack: () => void;
  getHighlightSegments: (text: string, indices: ReadonlyArray<[number, number]>) => { text: string; highlighted: boolean }[];
}

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

export function MenuBrowser({
  menuItems,
  filteredItems,
  menuLoading,
  categories,
  selectedCategory,
  searchQuery,
  debouncedQuery,
  highlightMap,
  recentItemIds,
  isOpen,
  productColumns,
  onCategoryChange,
  onSearchChange,
  onQuickAdd,
  onReloadMenu,
  onBack,
  getHighlightSegments,
}: MenuBrowserProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const searchInputRef = useRef<TextInput>(null);

  const recentItems = useMemo(() => {
    if (recentItemIds.length === 0) return [];
    const uniqueIds = [...new Set(recentItemIds)].slice(0, 8);
    return uniqueIds
      .map((id) => menuItems.find((m) => m.id === id))
      .filter(Boolean) as MenuItem[];
  }, [recentItemIds, menuItems]);

  const handleAdd = useCallback(
    (item: MenuItem) => {
      if (hasRequiredModifiers(item)) {
        router.push(`/menu-item/${item.id}`);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onQuickAdd(item);
    },
    [onQuickAdd, router],
  );

  const renderHighlightedText = useCallback(
    (text: string, match: HighlightMatch | undefined, style: any) => {
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
    [getHighlightSegments],
  );

  const renderRecentRow = () => {
    if (recentItems.length === 0 || searchQuery.length > 0 || selectedCategory !== 'all') return null;
    return (
      <View style={tw`mb-1`}>
        <View style={tw`flex-row items-center px-4 py-2`}>
          <MaterialCommunityIcons name="history" size={16} color="#9CA3AF" />
          <Text variant="medium" style={[tw`text-gray-400 ml-1.5 uppercase tracking-wider`, { fontSize: 12 }]}>
            Recent
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-3 pb-2`}>
          {recentItems.map((item) => {
            const catName = getItemCategoryName(item);
            return (
              <TouchableOpacity
                key={`recent-${item.id}`}
                style={tw`mr-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex-row items-center`}
                onPress={() => item.isAvailable && isOpen && handleAdd(item)}
                disabled={!item.isAvailable || !isOpen}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`w-7 h-7 rounded items-center justify-center mr-2`,
                    { backgroundColor: `${getCategoryColor(catName)}15` },
                  ]}
                >
                  <Text style={[{ color: getCategoryColor(catName), fontSize: 12, fontFamily: 'Geist-Bold' }]}>
                    {(catName || item.name)?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text variant="medium" style={[tw`text-gray-900 mr-2`, typography.caption]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[tw`text-gray-400`, typography.caption]}>R{item.price?.toFixed(0)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderGridItem = useCallback(
    (item: MenuItem, index: number) => {
      const highlights = highlightMap.get(item.id);
      const nameHL = highlights?.find((h) => h.field === 'name');
      const catName = getItemCategoryName(item);
      const catColor = getCategoryColor(catName);

      return (
        <TouchableOpacity
          key={`menu-${item.id}-${index}`}
          style={[tw`p-2 ${!item.isAvailable ? 'opacity-40' : ''} ${productColumns}`]}
          onPress={() => item.isAvailable && isOpen && handleAdd(item)}
          disabled={!item.isAvailable || !isOpen}
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
                    nameHL,
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
                  nameHL,
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
                <MaterialCommunityIcons
                  name={hasRequiredModifiers(item) ? 'dots-horizontal' : 'plus'}
                  size={18}
                  color={catColor}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [highlightMap, isOpen, productColumns, handleAdd, renderHighlightedText],
  );

  const renderListItem = useCallback(
    (item: MenuItem, index: number) => {
      const highlights = highlightMap.get(item.id);
      const nameHL = highlights?.find((h) => h.field === 'name');
      const catName = getItemCategoryName(item);
      const catColor = getCategoryColor(catName);

      return (
        <TouchableOpacity
          key={`menu-list-${item.id}-${index}`}
          style={[tw`px-4 py-3 border-b border-gray-50 flex-row items-center`, !item.isAvailable && tw`opacity-40`]}
          onPress={() => item.isAvailable && isOpen && handleAdd(item)}
          disabled={!item.isAvailable || !isOpen}
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
              nameHL,
              [tw`text-gray-900`, typography.bodyMedium],
            )}
            {catName && (
              <Text style={[tw`text-gray-400 mt-0.5`, typography.small]} numberOfLines={1}>{catName}</Text>
            )}
          </View>
          <Text variant="semibold" style={[tw`text-gray-900 mr-3`, typography.bodySemibold]}>
            R{item.price?.toFixed(2)}
          </Text>
          <View style={[tw`w-9 h-9 rounded-full items-center justify-center`, { backgroundColor: `${catColor}15` }]}>
            <MaterialCommunityIcons
              name={hasRequiredModifiers(item) ? 'dots-horizontal' : 'plus'}
              size={18}
              color={catColor}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [highlightMap, isOpen, handleAdd, renderHighlightedText],
  );

  const renderEmpty = () => (
    <View style={tw`flex-1 justify-center items-center p-6`}>
      <MaterialCommunityIcons name="magnify-close" size={48} color="#D1D5DB" />
      <Text variant="semibold" style={[tw`text-gray-700 text-center mb-1 mt-3`, typography.headingSemibold]}>No Items Found</Text>
      <Text style={[tw`text-gray-400 text-center mb-4`, typography.body]}>
        {selectedCategory !== 'all'
          ? `No items in "${selectedCategory}".`
          : debouncedQuery
            ? `No items matching "${debouncedQuery}".`
            : 'No menu items available.'}
      </Text>
      <View style={tw`flex-row gap-2`}>
        {(selectedCategory !== 'all' || searchQuery) && (
          <TouchableOpacity
            style={tw`bg-gray-100 rounded-xl py-2.5 px-4`}
            onPress={() => { onCategoryChange('all'); onSearchChange(''); }}
          >
            <Text variant="medium" style={[tw`text-gray-600`, typography.bodyMedium]}>Clear Filters</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[tw`rounded-xl py-2.5 px-4`, { backgroundColor: colors.primary.main }]}
          onPress={onReloadMenu}
        >
          <Text variant="medium" style={[tw`text-white`, typography.bodyMedium]}>Reload Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (menuLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={[tw`text-gray-500 mt-3`, typography.body]}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      {/* Search Header */}
      <View style={tw`flex-row items-center bg-white px-4 py-3 border-b border-gray-100`}>
        <TouchableOpacity onPress={onBack} style={tw`mr-3 p-2 bg-gray-50 rounded-full`}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>
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
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
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
              onPress={() => onCategoryChange(cat.id)}
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

      {/* Menu Content */}
      {filteredItems.length === 0 ? (
        renderEmpty()
      ) : (
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-16`}>
          {renderRecentRow()}
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
