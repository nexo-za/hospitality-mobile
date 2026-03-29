import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import type { MenuItem } from '@/types/hospitality';

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onQuickAdd(item);
    },
    [onQuickAdd],
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
          <MaterialCommunityIcons name="history" size={14} color="#9CA3AF" />
          <Text variant="medium" style={tw`text-gray-400 text-[11px] ml-1.5 uppercase tracking-wider`}>
            Recent
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-3 pb-2`}>
          {recentItems.map((item) => (
            <TouchableOpacity
              key={`recent-${item.id}`}
              style={tw`mr-2 bg-white border border-gray-100 rounded-xl px-3 py-2 flex-row items-center`}
              onPress={() => item.isAvailable && isOpen && handleAdd(item)}
              disabled={!item.isAvailable || !isOpen}
              activeOpacity={0.7}
            >
              <View
                style={[
                  tw`w-6 h-6 rounded items-center justify-center mr-2`,
                  { backgroundColor: `${getCategoryColor(item.categoryName)}15` },
                ]}
              >
                <Text style={[{ color: getCategoryColor(item.categoryName), fontSize: 10, fontFamily: 'Geist-Bold' }]}>
                  {(item.categoryName || item.name)?.[0]?.toUpperCase()}
                </Text>
              </View>
              <Text variant="medium" style={tw`text-gray-900 text-xs mr-2`} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={tw`text-gray-400 text-xs`}>R{item.price?.toFixed(0)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderGridItem = useCallback(
    (item: MenuItem, index: number) => {
      const highlights = highlightMap.get(item.id);
      const nameHL = highlights?.find((h) => h.field === 'name');
      const catName = item.categoryName || (item as any).category?.name;
      const catColor = getCategoryColor(catName);

      return (
        <TouchableOpacity
          key={`menu-${item.id}-${index}`}
          style={[tw`p-1.5 ${!item.isAvailable ? 'opacity-40' : ''} ${productColumns}`]}
          onPress={() => item.isAvailable && isOpen && handleAdd(item)}
          disabled={!item.isAvailable || !isOpen}
          activeOpacity={0.7}
        >
          <View style={tw`bg-white rounded-xl p-2.5 border border-gray-100 overflow-hidden`}>
            <View style={tw`flex-row items-start`}>
              <View
                style={[
                  tw`w-9 h-9 rounded-lg items-center justify-center mr-2`,
                  { backgroundColor: `${catColor}15` },
                ]}
              >
                <MaterialCommunityIcons name="food-variant" size={18} color={catColor} />
              </View>
              <View style={tw`flex-1`}>
                {renderHighlightedText(
                  item.name,
                  nameHL,
                  [tw`text-gray-900`, typography.caption, { fontFamily: 'Geist-Medium' }],
                )}
                {catName && (
                  <Text style={tw`text-gray-400 text-[10px]`} numberOfLines={1}>{catName}</Text>
                )}
              </View>
            </View>
            <View style={tw`flex-row items-center justify-between mt-2`}>
              <Text variant="semibold" style={[tw`text-gray-900`, { fontSize: 13 }]}>
                R{item.price?.toFixed(2)}
              </Text>
              <View style={[tw`w-7 h-7 rounded-full items-center justify-center`, { backgroundColor: `${catColor}15` }]}>
                <MaterialCommunityIcons name="plus" size={16} color={catColor} />
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
      const catName = item.categoryName || (item as any).category?.name;
      const catColor = getCategoryColor(catName);

      return (
        <TouchableOpacity
          key={`menu-list-${item.id}-${index}`}
          style={[tw`px-4 py-2 border-b border-gray-50 flex-row items-center`, !item.isAvailable && tw`opacity-40`]}
          onPress={() => item.isAvailable && isOpen && handleAdd(item)}
          disabled={!item.isAvailable || !isOpen}
          activeOpacity={0.6}
        >
          <View
            style={[
              tw`w-8 h-8 rounded-lg items-center justify-center mr-3`,
              { backgroundColor: `${catColor}15` },
            ]}
          >
            <MaterialCommunityIcons name="food-variant" size={16} color={catColor} />
          </View>
          <View style={tw`flex-1 mr-3`}>
            {renderHighlightedText(
              item.name,
              nameHL,
              [tw`text-gray-900`, typography.caption, { fontFamily: 'Geist-Medium' }],
            )}
            {catName && (
              <Text style={tw`text-gray-400 text-[10px]`} numberOfLines={1}>{catName}</Text>
            )}
          </View>
          <Text variant="semibold" style={tw`text-gray-900 text-sm mr-3`}>
            R{item.price?.toFixed(2)}
          </Text>
          <View style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: `${catColor}15` }]}>
            <MaterialCommunityIcons name="plus" size={16} color={catColor} />
          </View>
        </TouchableOpacity>
      );
    },
    [highlightMap, isOpen, handleAdd, renderHighlightedText],
  );

  const renderEmpty = () => (
    <View style={tw`flex-1 justify-center items-center p-6`}>
      <MaterialCommunityIcons name="magnify-close" size={40} color="#D1D5DB" />
      <Text variant="semibold" style={tw`text-gray-700 text-center mb-1 mt-3`}>No Items Found</Text>
      <Text style={tw`text-gray-400 text-center text-sm mb-4`}>
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
            <Text variant="medium" style={tw`text-gray-600 text-sm`}>Clear Filters</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[tw`rounded-xl py-2.5 px-4`, { backgroundColor: colors.primary.main }]}
          onPress={onReloadMenu}
        >
          <Text variant="medium" style={tw`text-white text-sm`}>Reload Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (menuLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={tw`text-gray-500 mt-3 text-sm`}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      {/* Search Header */}
      <View style={tw`flex-row items-center bg-white px-3 py-2 border-b border-gray-100`}>
        <TouchableOpacity onPress={onBack} style={tw`mr-2 p-2 bg-gray-50 rounded-full`}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`flex-1 flex-row items-center bg-gray-50 rounded-xl px-3 py-1.5`}
          activeOpacity={0.7}
          onPress={() => searchInputRef.current?.focus()}
        >
          <MaterialCommunityIcons name="magnify" size={18} color="#9CA3AF" />
          <TextInput
            ref={searchInputRef}
            style={[tw`flex-1 ml-2 text-gray-900 py-1.5`, { fontSize: 14, fontFamily: 'Geist-Regular' }]}
            placeholder="Search menu items..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <MaterialCommunityIcons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`ml-2 p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-50' : 'bg-gray-50'}`}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'format-list-bulleted' : 'grid'}
            size={18}
            color={viewMode === 'list' ? colors.primary.main : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={tw`h-11 bg-white border-b border-gray-100`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`px-3`} contentContainerStyle={tw`h-11 items-center`}>
          {categories.map((cat, idx) => (
            <TouchableOpacity
              key={`cat-${cat.id}-${idx}`}
              style={tw`mr-1.5 px-3 py-1.5 rounded-full ${selectedCategory === cat.id ? 'bg-blue-600' : 'bg-gray-50'}`}
              onPress={() => onCategoryChange(cat.id)}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={14}
                  color={selectedCategory === cat.id ? '#fff' : '#9CA3AF'}
                />
                <Text style={tw`ml-1.5 text-xs ${selectedCategory === cat.id ? 'text-white font-semibold' : 'text-gray-600'}`}>
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
