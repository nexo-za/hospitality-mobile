import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ModifierGroup, Modifier } from '@/types/hospitality';

interface ModifierGroupSelectorProps {
  group: ModifierGroup;
  selectedModifierIds: number[];
  onToggle: (modifierId: number) => void;
  validationError?: string;
}

function getSelectionLabel(group: ModifierGroup): string {
  const parts: string[] = [];
  if (group.isRequired) parts.push('Required');
  else parts.push('Optional');

  if (group.selectionType === 'SINGLE') {
    parts.push('pick 1');
  } else {
    if (group.minSelections > 0 && group.maxSelections != null) {
      parts.push(`pick ${group.minSelections}–${group.maxSelections}`);
    } else if (group.minSelections > 0) {
      parts.push(`min ${group.minSelections}`);
    } else if (group.maxSelections != null) {
      parts.push(`up to ${group.maxSelections}`);
    }
  }
  return parts.join(' · ');
}

export function ModifierGroupSelector({
  group,
  selectedModifierIds,
  onToggle,
  validationError,
}: ModifierGroupSelectorProps) {
  const isSingle = group.selectionType === 'SINGLE';
  const atMax =
    group.maxSelections != null &&
    selectedModifierIds.length >= group.maxSelections;

  return (
    <View style={tw`mt-4`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-4 mb-2`}>
        <View style={tw`flex-row items-center`}>
          <Text style={[tw`text-xs text-gray-500 uppercase`, typography.captionSemibold]}>
            {group.displayName || group.name}
          </Text>
          {group.isRequired && (
            <View style={tw`bg-red-50 rounded-full px-1.5 py-0.5 ml-2`}>
              <Text style={[tw`text-[10px] text-red-600`, typography.captionSemibold]}>
                Required
              </Text>
            </View>
          )}
        </View>
        <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
          {getSelectionLabel(group)}
        </Text>
      </View>

      {/* Validation error */}
      {validationError && (
        <View style={tw`mx-4 mb-2 bg-red-50 rounded-lg px-3 py-1.5`}>
          <Text style={[tw`text-xs text-red-600`, typography.caption]}>
            {validationError}
          </Text>
        </View>
      )}

      {/* Modifiers */}
      <View style={tw`bg-white rounded-xl mx-4 overflow-hidden border border-gray-100`}>
        {group.modifiers
          .filter((m) => m.isActive)
          .map((mod, idx, arr) => {
            const selected = selectedModifierIds.includes(mod.id);
            const disabled = !selected && atMax;

            return (
              <TouchableOpacity
                key={mod.id}
                style={[
                  tw`flex-row items-center px-4 py-3`,
                  idx < arr.length - 1 && tw`border-b border-gray-50`,
                  disabled && { opacity: 0.4 },
                ]}
                onPress={() => !disabled && onToggle(mod.id)}
                disabled={disabled}
              >
                <MaterialCommunityIcons
                  name={
                    isSingle
                      ? selected
                        ? 'radiobox-marked'
                        : 'radiobox-blank'
                      : selected
                        ? 'checkbox-marked'
                        : 'checkbox-blank-outline'
                  }
                  size={22}
                  color={selected ? '#3B82F6' : '#D1D5DB'}
                />
                <Text style={[tw`flex-1 text-base ml-3`, typography.body]}>
                  {mod.name}
                </Text>
                {mod.priceAdjustment !== 0 && (
                  <Text style={[tw`text-sm text-gray-500`, typography.body]}>
                    {mod.priceAdjustment > 0 ? '+' : ''}R{mod.priceAdjustment.toFixed(2)}
                  </Text>
                )}
                {mod.priceAdjustment === 0 && selected && (
                  <Text style={[tw`text-sm text-gray-400`, typography.caption]}>
                    Included
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}
