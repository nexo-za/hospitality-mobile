import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Menu } from '@/types/hospitality';

const MENU_TYPE_ICONS: Record<string, string> = {
  REGULAR: 'silverware-fork-knife',
  BREAKFAST: 'coffee',
  LUNCH: 'food',
  DINNER: 'candelabra-fire',
  HAPPY_HOUR: 'glass-cocktail',
  BRUNCH: 'egg-fried',
  LATE_NIGHT: 'weather-night',
  SEASONAL: 'leaf',
  CATERING: 'account-group',
  KIDS: 'baby-face-outline',
};

function formatMenuType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

interface MenuSelectorProps {
  menus: Menu[];
  selectedId: number | null;
  onSelect: (menu: Menu) => void;
}

export function MenuSelector({ menus, selectedId, onSelect }: MenuSelectorProps) {
  if (menus.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`px-4 py-2`}
    >
      {menus.map((menu) => {
        const active = selectedId === menu.id;
        const icon = MENU_TYPE_ICONS[menu.menuType] ?? 'silverware-fork-knife';
        return (
          <TouchableOpacity
            key={menu.id}
            style={[
              tw`flex-row items-center rounded-full px-5 py-2.5 mr-2 border`,
              active
                ? tw`bg-blue-600 border-blue-600`
                : tw`bg-white border-gray-200`,
            ]}
            onPress={() => onSelect(menu)}
          >
            <MaterialCommunityIcons
              name={icon as any}
              size={18}
              color={active ? '#fff' : '#6B7280'}
              style={tw`mr-2`}
            />
            <Text
              style={[
                active ? tw`text-white` : tw`text-gray-700`,
                typography.bodySemibold,
              ]}
            >
              {menu.name || formatMenuType(menu.menuType)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
