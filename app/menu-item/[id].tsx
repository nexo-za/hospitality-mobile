import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useMenu } from '@/contexts/MenuContext';
import { useOrder } from '@/contexts/OrderContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MenuItem, Modifier } from '@/types/hospitality';

export default function MenuItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getMenuItem, toggleAvailability } = useMenu();
  const { currentCheck, addItem } = useOrder();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Map<number, number[]>
  >(new Map());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMenuItem(Number(id));
      setItem(data);
    } catch {
      Alert.alert('Error', 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const toggleModifier = (groupId: number, modId: number) => {
    setSelectedModifiers((prev) => {
      const next = new Map(prev);
      const current = next.get(groupId) || [];
      if (current.includes(modId)) {
        next.set(
          groupId,
          current.filter((m) => m !== modId)
        );
      } else {
        next.set(groupId, [...current, modId]);
      }
      return next;
    });
  };

  const handleAddToOrder = async () => {
    if (!item || !currentCheck) {
      Alert.alert(
        'No Active Order',
        'Please open an order first from the Orders tab.'
      );
      return;
    }
    setAdding(true);
    try {
      const modifiers: Array<{ modifierId: number; quantity: number }> = [];
      selectedModifiers.forEach((modIds) => {
        modIds.forEach((modId) => {
          modifiers.push({ modifierId: modId, quantity: 1 });
        });
      });

      await addItem(currentCheck.id, {
        menuItemId: item.id,
        quantity,
        modifiers: modifiers.length > 0 ? modifiers : undefined,
      });
      Alert.alert('Added', `${quantity}x ${item.name} added to order`);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Text style={[tw`text-center mt-10 text-gray-500`, typography.body]}>
          Item not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View
        style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3 flex-1`, typography.headingSemibold]}>
          {item.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={tw`pb-32`}>
        <View style={tw`bg-white px-4 py-4`}>
          <Text style={[tw`text-2xl text-blue-600`, typography.headingSemibold]}>
            R{item.price?.toFixed(2)}
          </Text>
          {item.description && (
            <Text style={[tw`text-sm text-gray-500 mt-2`, typography.body]}>
              {item.description}
            </Text>
          )}
          {item.categoryName && (
            <View style={tw`flex-row mt-2`}>
              <View style={tw`bg-gray-100 rounded-full px-2 py-0.5`}>
                <Text style={[tw`text-xs text-gray-600`, typography.caption]}>
                  {item.categoryName}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quantity selector */}
        <View style={tw`bg-white mt-4 px-4 py-4 flex-row items-center justify-between`}>
          <Text style={[tw`text-base`, typography.bodySemibold]}>
            Quantity
          </Text>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full border border-gray-300 items-center justify-center`}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <MaterialCommunityIcons name="minus" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={[tw`text-lg mx-4`, typography.headingSemibold]}>
              {quantity}
            </Text>
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full border border-gray-300 items-center justify-center`}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Modifier groups */}
        {item.modifierGroups?.map((group) => (
          <View key={group.id} style={tw`mt-4`}>
            <Text
              style={[
                tw`text-xs text-gray-400 uppercase px-4 mb-2`,
                typography.captionSemibold,
              ]}
            >
              {group.name}
              {group.isRequired ? ' (Required)' : ''}
            </Text>
            <View style={tw`bg-white`}>
              {group.modifiers.map((mod, idx) => {
                const selected = (
                  selectedModifiers.get(group.id) || []
                ).includes(mod.id);
                return (
                  <TouchableOpacity
                    key={mod.id}
                    style={tw`flex-row items-center px-4 py-3 ${
                      idx < group.modifiers.length - 1
                        ? 'border-b border-gray-50'
                        : ''
                    }`}
                    onPress={() => toggleModifier(group.id, mod.id)}
                  >
                    <MaterialCommunityIcons
                      name={
                        selected
                          ? 'checkbox-marked'
                          : 'checkbox-blank-outline'
                      }
                      size={22}
                      color={selected ? '#3B82F6' : '#D1D5DB'}
                    />
                    <Text
                      style={[tw`flex-1 text-base ml-3`, typography.body]}
                    >
                      {mod.name}
                    </Text>
                    {mod.price > 0 && (
                      <Text
                        style={[tw`text-sm text-gray-500`, typography.body]}
                      >
                        +R{mod.price.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3`}
      >
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-xl py-4 items-center ${
            adding ? 'opacity-50' : ''
          }`}
          onPress={handleAddToOrder}
          disabled={adding}
        >
          <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
            {adding
              ? 'Adding...'
              : `Add ${quantity}x to Order - R${(
                  item.price * quantity
                ).toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
