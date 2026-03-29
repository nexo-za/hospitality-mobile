import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MenuCategory } from '@/types/hospitality';

interface CategoryTabsProps {
  categories: MenuCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  showCounts?: boolean;
}

export function CategoryTabs({
  categories,
  selectedId,
  onSelect,
  showCounts,
}: CategoryTabsProps) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`px-4 py-2.5 items-center`}
    >
      <TouchableOpacity
        style={[
          tw`flex-row items-center rounded-full px-5 py-2.5 mr-2 border`,
          selectedId === null
            ? tw`bg-gray-900 border-gray-900`
            : tw`bg-white border-gray-200`,
        ]}
        onPress={() => onSelect(null)}
      >
        <MaterialCommunityIcons
          name="grid"
          size={16}
          color={selectedId === null ? '#fff' : '#6B7280'}
          style={tw`mr-2`}
        />
        <Text
          style={[
            selectedId === null ? tw`text-white` : tw`text-gray-600`,
            typography.bodySemibold,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const active = selectedId === cat.id;
        const count = cat._count?.items ?? cat.items?.length;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              tw`flex-row items-center rounded-full px-5 py-2.5 mr-2 border`,
              active
                ? tw`bg-gray-900 border-gray-900`
                : tw`bg-white border-gray-200`,
            ]}
            onPress={() => onSelect(cat.id)}
          >
            <Text
              style={[
                active ? tw`text-white` : tw`text-gray-600`,
                typography.bodySemibold,
              ]}
            >
              {cat.name}
            </Text>
            {showCounts && count != null && (
              <View
                style={[
                  tw`ml-2 rounded-full px-2 min-w-[24px] items-center`,
                  active ? tw`bg-white/20` : tw`bg-gray-100`,
                ]}
              >
                <Text
                  style={[
                    active ? tw`text-white` : tw`text-gray-500`,
                    typography.captionSemibold,
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
