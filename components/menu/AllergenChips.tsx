import React from 'react';
import { View } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ALLERGEN_META: Record<string, { color: string; icon: string }> = {
  gluten: { color: '#DC2626', icon: 'grain' },
  dairy: { color: '#2563EB', icon: 'cheese' },
  nuts: { color: '#92400E', icon: 'peanut' },
  shellfish: { color: '#DB2777', icon: 'fish' },
  soy: { color: '#65A30D', icon: 'soy-sauce' },
  eggs: { color: '#EA580C', icon: 'egg' },
  fish: { color: '#0891B2', icon: 'fish' },
  sesame: { color: '#7C3AED', icon: 'seed' },
};

const DIETARY_META: Record<string, { color: string; bg: string; icon: string }> = {
  vegetarian: { color: '#16A34A', bg: '#F0FDF4', icon: 'leaf' },
  vegan: { color: '#15803D', bg: '#F0FDF4', icon: 'sprout' },
  halal: { color: '#0369A1', bg: '#F0F9FF', icon: 'food-halal' },
  kosher: { color: '#7C3AED', bg: '#FAF5FF', icon: 'star-david' },
  'gluten-free': { color: '#CA8A04', bg: '#FEFCE8', icon: 'grain' },
};

function getAllergenMeta(name: string) {
  const key = name.toLowerCase();
  for (const [k, meta] of Object.entries(ALLERGEN_META)) {
    if (key.includes(k)) return meta;
  }
  return { color: '#DC2626', icon: 'alert-circle-outline' };
}

interface AllergenChipsProps {
  allergens?: string[];
  dietaryFlags?: string[];
  compact?: boolean;
}

export function AllergenChips({ allergens, dietaryFlags, compact }: AllergenChipsProps) {
  const hasAllergens = allergens && allergens.length > 0;
  const hasDietary = dietaryFlags && dietaryFlags.length > 0;

  if (!hasAllergens && !hasDietary) return null;

  return (
    <View style={tw`flex-row flex-wrap gap-1.5`}>
      {dietaryFlags?.map((flag) => {
        const meta = DIETARY_META[flag.toLowerCase()] ?? { color: '#16A34A', bg: '#F0FDF4', icon: 'leaf' };
        return (
          <View
            key={flag}
            style={[tw`flex-row items-center rounded-full px-2 py-1`, { backgroundColor: meta.bg }]}
          >
            <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
            {!compact && (
              <Text style={[tw`text-xs ml-1`, { color: meta.color }, typography.captionSemibold]}>
                {flag}
              </Text>
            )}
          </View>
        );
      })}
      {allergens?.map((a) => {
        const meta = getAllergenMeta(a);
        return (
          <View
            key={a}
            style={[
              tw`flex-row items-center rounded-full px-2 py-1`,
              { backgroundColor: `${meta.color}10` },
            ]}
          >
            <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: meta.color }]} />
            {!compact && (
              <Text style={[tw`text-xs ml-1 text-gray-600`, typography.caption]}>{a}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
