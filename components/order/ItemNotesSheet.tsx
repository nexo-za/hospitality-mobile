import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import type { CheckItem } from '@/types/hospitality';

interface ItemNotesSheetProps {
  visible: boolean;
  item: CheckItem | null;
  onClose: () => void;
  onSave: (itemId: number, specialRequests: string) => void;
}

const PRESET_GROUPS: { label: string; icon: string; presets: string[] }[] = [
  {
    label: 'Cooking',
    icon: 'fire',
    presets: ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'],
  },
  {
    label: 'Preparation',
    icon: 'silverware-fork-knife',
    presets: ['Extra Sauce', 'Sauce on Side', 'No Ice', 'Extra Spicy', 'Mild'],
  },
  {
    label: 'Allergens & Dietary',
    icon: 'alert-circle-outline',
    presets: ['No Nuts', 'No Dairy', 'No Gluten', 'No Onions', 'No Garlic', 'No Shellfish'],
  },
];

const ALL_PRESETS = PRESET_GROUPS.flatMap((g) => g.presets);

function parseExistingNote(note: string): { selected: Set<string>; custom: string } {
  const selected = new Set<string>();
  let remaining = note;

  for (const preset of ALL_PRESETS) {
    const regex = new RegExp(`(^|, ?)${preset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(, ?|$)`, 'i');
    if (regex.test(remaining)) {
      selected.add(preset);
      remaining = remaining.replace(regex, (_, before, after) => (before && after ? ', ' : ''));
    }
  }

  remaining = remaining.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
  return { selected, custom: remaining };
}

function buildNote(selected: Set<string>, custom: string): string {
  const parts: string[] = [];
  for (const group of PRESET_GROUPS) {
    for (const preset of group.presets) {
      if (selected.has(preset)) parts.push(preset);
    }
  }
  const presetStr = parts.join(', ');
  const customStr = custom.trim();
  if (presetStr && customStr) return `${presetStr}. ${customStr}`;
  return presetStr || customStr;
}

export function ItemNotesSheet({ visible, item, onClose, onSave }: ItemNotesSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    if (visible && item) {
      if (item.specialRequests) {
        const parsed = parseExistingNote(item.specialRequests);
        setSelected(parsed.selected);
        setCustomText(parsed.custom);
      } else {
        setSelected(new Set());
        setCustomText('');
      }
    }
  }, [visible, item]);

  const togglePreset = useCallback((preset: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(preset)) {
        next.delete(preset);
      } else {
        next.add(preset);
      }
      return next;
    });
  }, []);

  const preview = useMemo(() => buildNote(selected, customText), [selected, customText]);
  const hasChanges = preview !== (item?.specialRequests || '');
  const hasContent = preview.length > 0;

  const handleSave = useCallback(() => {
    if (!item) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(item.id, preview);
    onClose();
  }, [item, preview, onSave, onClose]);

  const handleClear = useCallback(() => {
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(new Set());
    setCustomText('');
  }, [item]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={tw`flex-1 bg-black/50`} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw`flex-1 justify-end`}
        >
          <Pressable style={tw`bg-white rounded-t-[20px] max-h-[85%]`} onPress={() => {}}>
            <View style={tw`items-center pt-3 pb-1`}>
              <View style={tw`w-10 h-1 rounded-full bg-neutral-border`} />
            </View>

            <View style={tw`flex-row items-center justify-between px-5 py-3 border-b border-neutral-border`}>
              <View style={tw`flex-row items-center flex-1 mr-3`}>
                <View style={[tw`w-9 h-9 rounded-full items-center justify-center mr-3`, { backgroundColor: '#FFF7ED' }]}>
                  <MaterialCommunityIcons name="note-edit-outline" size={20} color="#EA580C" />
                </View>
                <View style={tw`flex-1`}>
                  <Text variant="semibold" style={[typography.h3, tw`text-black`]}>
                    Special Instructions
                  </Text>
                  <Text style={[typography.caption, tw`text-neutral-darkGray mt-0.5`]} numberOfLines={1}>
                    {item.menuItemName}
                    {item.variantName ? ` · ${item.variantName}` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={22} color={colors.neutral.darkGray} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={tw`px-5`}
              contentContainerStyle={tw`pb-6`}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {PRESET_GROUPS.map((group) => (
                <View key={group.label} style={tw`mt-4`}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <MaterialCommunityIcons
                      name={group.icon as any}
                      size={14}
                      color="#9CA3AF"
                    />
                    <Text variant="medium" style={[tw`text-gray-400 ml-1.5 uppercase tracking-wider`, typography.small]}>
                      {group.label}
                    </Text>
                  </View>
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {group.presets.map((preset) => {
                      const isSelected = selected.has(preset);
                      return (
                        <TouchableOpacity
                          key={preset}
                          onPress={() => togglePreset(preset)}
                          style={[
                            tw`px-3.5 py-2 rounded-full border`,
                            isSelected
                              ? { backgroundColor: '#FFF7ED', borderColor: '#EA580C' }
                              : tw`border-gray-200 bg-gray-50`,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            variant={isSelected ? 'medium' : undefined}
                            style={[
                              typography.caption,
                              isSelected ? tw`text-orange-600` : tw`text-gray-600`,
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={tw`mt-5`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color="#9CA3AF" />
                  <Text variant="medium" style={[tw`text-gray-400 ml-1.5 uppercase tracking-wider`, typography.small]}>
                    Custom Note
                  </Text>
                </View>
                <TextInput
                  style={[
                    tw`border border-gray-200 rounded-xl px-4 py-3 bg-gray-50`,
                    typography.caption,
                    { minHeight: 64, textAlignVertical: 'top' },
                  ]}
                  placeholder="E.g. allergic to sesame, extra napkins, birthday celebration..."
                  placeholderTextColor="#9CA3AF"
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  maxLength={500}
                />
              </View>

              {preview.length > 0 && (
                <View style={[tw`mt-4 p-3 rounded-xl`, { backgroundColor: '#FFF7ED' }]}>
                  <View style={tw`flex-row items-center mb-1`}>
                    <MaterialCommunityIcons name="eye-outline" size={14} color="#EA580C" />
                    <Text variant="medium" style={[tw`text-orange-600 ml-1`, typography.small]}>
                      Kitchen will see
                    </Text>
                  </View>
                  <Text style={[tw`text-orange-700`, typography.caption]}>{preview}</Text>
                </View>
              )}
            </ScrollView>

            <View style={tw`flex-row items-center px-5 py-4 border-t border-gray-100 gap-3`}>
              {hasContent && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={tw`px-4 py-3 rounded-xl border border-gray-200`}
                  activeOpacity={0.7}
                >
                  <Text variant="medium" style={[tw`text-gray-500`, typography.captionMedium]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!hasChanges}
                style={[
                  tw`flex-1 py-3.5 rounded-xl items-center`,
                  { backgroundColor: '#EA580C' },
                  !hasChanges && tw`opacity-40`,
                ]}
                activeOpacity={0.8}
              >
                <Text variant="semibold" style={[tw`text-white`, typography.captionSemibold]}>
                  {hasContent ? 'Save Instructions' : 'Remove Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
