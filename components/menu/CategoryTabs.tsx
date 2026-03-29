import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function CategoryTabs({
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
      contentContainerStyle={tw`px-4 py-3 items-center`}
    >
      {categories.map((cat) => {
        const active = cat === selected;
        // In Retail, "All" has a specific icon
        const isAll = cat === 'All';
        
        return (
          <TouchableOpacity
            key={cat}
            style={[
              tw`flex-row items-center rounded-full px-5 py-2.5 mr-2 border`,
              active
                ? tw`bg-blue-600 border-blue-600 shadow-sm`
                : tw`bg-white border-gray-200`,
            ]}
            onPress={() => onSelect(cat)}
          >
            {isAll && (
              <MaterialCommunityIcons 
                name="grid" 
                size={16} 
                color={active ? '#ffffff' : '#6B7280'} 
                style={tw`mr-2`}
              />
            )}
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
