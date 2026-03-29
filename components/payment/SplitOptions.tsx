import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Check, SplitType } from '@/types/hospitality';

interface SplitConfig {
  splitCount?: number;
  itemIds?: number[];
  amounts?: number[];
}

interface SplitOptionsProps {
  check: Check;
  onSplitSelect: (splitType: SplitType, config: SplitConfig) => void;
}

type SectionKey = 'EVEN' | 'BY_ITEM' | 'BY_AMOUNT';

interface SectionConfig {
  key: SectionKey;
  splitType: SplitType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const SECTIONS: SectionConfig[] = [
  { key: 'EVEN', splitType: 'EVEN', label: 'Split Equally', icon: 'account-group-outline' },
  { key: 'BY_ITEM', splitType: 'BY_ITEM', label: 'Split by Item', icon: 'format-list-checks' },
  { key: 'BY_AMOUNT', splitType: 'BY_AMOUNT', label: 'Split by Amount', icon: 'calculator-variant-outline' },
];

export default function SplitOptions({ check, onSplitSelect }: SplitOptionsProps) {
  const [expanded, setExpanded] = useState<SectionKey | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [customAmount, setCustomAmount] = useState('');

  const activeItems = useMemo(
    () => (check.items || []).filter((i) => i.status !== 'VOIDED'),
    [check.items]
  );

  const toggleSection = (key: SectionKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const perPerson = splitCount > 0 ? (check.totalAmount ?? 0) / splitCount : 0;

  const selectedItemsTotal = useMemo(
    () =>
      activeItems
        .filter((i) => selectedItemIds.has(i.id))
        .reduce((sum, i) => sum + (i.totalPrice ?? 0), 0),
    [activeItems, selectedItemIds]
  );

  return (
    <View style={tw`bg-white rounded-xl mt-3 overflow-hidden`}>
      <Text style={[tw`text-sm text-gray-500 px-4 pt-4 pb-2`, typography.captionSemibold]}>
        SPLIT CHECK
      </Text>

      {SECTIONS.map((section) => {
        const isExpanded = expanded === section.key;
        return (
          <View key={section.key}>
            <TouchableOpacity
              style={tw`flex-row items-center px-4 py-3 border-t border-gray-100`}
              onPress={() => toggleSection(section.key)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={section.icon}
                size={22}
                color={isExpanded ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  tw`flex-1 ml-3 text-base ${isExpanded ? 'text-blue-600' : 'text-gray-800'}`,
                  typography.bodySemibold,
                ]}
              >
                {section.label}
              </Text>
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {isExpanded && section.key === 'EVEN' && (
              <View style={tw`px-4 pb-4`}>
                <Text style={[tw`text-sm text-gray-500 mb-2`, typography.caption]}>
                  Number of guests
                </Text>
                <View style={tw`flex-row items-center`}>
                  <TouchableOpacity
                    style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
                    onPress={() => setSplitCount((c) => Math.max(2, c - 1))}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color="#374151" />
                  </TouchableOpacity>
                  <Text style={[tw`mx-5 text-2xl`, typography.h2]}>{splitCount}</Text>
                  <TouchableOpacity
                    style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
                    onPress={() => setSplitCount((c) => Math.min(10, c + 1))}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
                <View style={tw`mt-3 bg-blue-50 rounded-lg px-3 py-2 flex-row justify-between`}>
                  <Text style={[tw`text-blue-700`, typography.caption]}>Per person</Text>
                  <Text style={[tw`text-blue-700`, typography.captionSemibold]}>
                    R{perPerson.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={tw`mt-3 bg-blue-500 rounded-xl py-3 items-center`}
                  onPress={() =>
                    onSplitSelect('EVEN', {
                      splitCount,
                      amounts: Array(splitCount).fill(
                        Math.round(perPerson * 100) / 100
                      ),
                    })
                  }
                >
                  <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                    Split into {splitCount}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isExpanded && section.key === 'BY_ITEM' && (
              <View style={tw`px-4 pb-4`}>
                <Text style={[tw`text-sm text-gray-500 mb-2`, typography.caption]}>
                  Select items for this payment
                </Text>
                {activeItems.map((item) => {
                  const isChecked = selectedItemIds.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={tw`flex-row items-center py-2 border-b border-gray-50`}
                      onPress={() => toggleItem(item.id)}
                    >
                      <MaterialCommunityIcons
                        name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isChecked ? '#2563EB' : '#9CA3AF'}
                      />
                      <Text style={[tw`flex-1 ml-2 text-base`, typography.body]}>
                        {item.quantity}x {item.menuItemName}
                      </Text>
                      <Text style={[tw`text-base`, typography.bodySemibold]}>
                        R{(item.totalPrice ?? 0).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {selectedItemIds.size > 0 && (
                  <>
                    <View
                      style={tw`mt-2 bg-blue-50 rounded-lg px-3 py-2 flex-row justify-between`}
                    >
                      <Text style={[tw`text-blue-700`, typography.caption]}>
                        Selected total
                      </Text>
                      <Text style={[tw`text-blue-700`, typography.captionSemibold]}>
                        R{selectedItemsTotal.toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={tw`mt-3 bg-blue-500 rounded-xl py-3 items-center`}
                      onPress={() =>
                        onSplitSelect('BY_ITEM', {
                          itemIds: Array.from(selectedItemIds),
                        })
                      }
                    >
                      <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                        Pay for Selected Items
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {isExpanded && section.key === 'BY_AMOUNT' && (
              <View style={tw`px-4 pb-4`}>
                <Text style={[tw`text-sm text-gray-500 mb-2`, typography.caption]}>
                  Enter amount for this payment
                </Text>
                <View
                  style={tw`flex-row items-center border border-gray-200 rounded-lg px-3`}
                >
                  <Text style={[tw`text-base text-gray-400 mr-1`, typography.body]}>R</Text>
                  <TextInput
                    style={[tw`flex-1 py-2.5 text-base`, typography.body]}
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    keyboardType="decimal-pad"
                    placeholder={(check.totalAmount ?? 0).toFixed(2)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <TouchableOpacity
                  style={tw`mt-3 bg-blue-500 rounded-xl py-3 items-center`}
                  onPress={() => {
                    const parsed = parseFloat(customAmount);
                    if (!isNaN(parsed) && parsed > 0) {
                      onSplitSelect('BY_AMOUNT', {
                        amounts: [Math.round(parsed * 100) / 100],
                      });
                    }
                  }}
                >
                  <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                    Pay Custom Amount
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
