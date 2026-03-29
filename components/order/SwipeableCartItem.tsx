import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import type { CheckItem } from '@/types/hospitality';

interface SwipeableCartItemProps {
  item: CheckItem;
  isOpen: boolean;
  onQuantityChange: (itemId: number, newQuantity: number) => void;
  onVoidPress: (item: CheckItem) => void;
  onRepeatPress: (item: CheckItem) => void;
  onMorePress: (item: CheckItem) => void;
  onRemove: (itemId: number) => void;
  onEditNote?: (item: CheckItem) => void;
}

const ACTION_WIDTH = 72;

export function SwipeableCartItem({
  item,
  isOpen,
  onQuantityChange,
  onVoidPress,
  onRepeatPress,
  onMorePress,
  onRemove,
  onEditNote,
}: SwipeableCartItemProps) {
  const swipeRef = useRef<Swipeable>(null);

  const isUnfired = item.firingStatus === 'FIRE_HOLD';
  const isSent = item.firingStatus === 'FIRE' && item.status === 'PENDING';

  const close = useCallback(() => swipeRef.current?.close(), []);

  const handleAction = useCallback(
    (action: () => void) => {
      close();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      action();
    },
    [close],
  );

  const renderLeftActions = useCallback(() => {
    if (!isOpen) return null;
    return (
      <RectButton
        style={[styles.actionBtn, { backgroundColor: '#16A34A', width: ACTION_WIDTH }]}
        onPress={() => handleAction(() => onRepeatPress(item))}
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={20} color="white" />
        <Text style={styles.actionLabel}>Repeat</Text>
      </RectButton>
    );
  }, [isOpen, item, onRepeatPress, handleAction]);

  const renderRightActions = useCallback(() => {
    if (!isOpen) return null;
    return (
      <View style={tw`flex-row`}>
        <RectButton
          style={[styles.actionBtn, { backgroundColor: colors.primary.main, width: ACTION_WIDTH }]}
          onPress={() => handleAction(() => onMorePress(item))}
        >
          <MaterialCommunityIcons name="tune-variant" size={20} color="white" />
          <Text style={styles.actionLabel}>More</Text>
        </RectButton>
        {isUnfired ? (
          <RectButton
            style={[styles.actionBtn, { backgroundColor: '#6B7280', width: ACTION_WIDTH }]}
            onPress={() => handleAction(() => onRemove(item.id))}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color="white" />
            <Text style={styles.actionLabel}>Remove</Text>
          </RectButton>
        ) : (
          <RectButton
            style={[styles.actionBtn, { backgroundColor: colors.status.error, width: ACTION_WIDTH }]}
            onPress={() => handleAction(() => onVoidPress(item))}
          >
            <MaterialCommunityIcons name="cancel" size={20} color="white" />
            <Text style={styles.actionLabel}>Void</Text>
          </RectButton>
        )}
      </View>
    );
  }, [isOpen, isUnfired, item, onMorePress, onRemove, onVoidPress, handleAction]);

  const statusBadge = getStatusBadge(item, isUnfired, isSent);
  const statusDotColor = getStatusDotColor(item, isUnfired, isSent);

  const handleDecrement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.quantity <= 1) {
      onRemove(item.id);
    } else {
      onQuantityChange(item.id, item.quantity - 1);
    }
  }, [item.id, item.quantity, onQuantityChange, onRemove]);

  const handleIncrement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuantityChange(item.id, item.quantity + 1);
  }, [item.id, item.quantity, onQuantityChange]);

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={isOpen ? renderLeftActions : undefined}
      renderRightActions={isOpen ? renderRightActions : undefined}
      leftThreshold={40}
      rightThreshold={40}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={tw`bg-white px-4 py-3 border-b border-gray-50`}>
        <View style={tw`flex-row items-center`}>
          {statusDotColor && (
            <View style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: statusDotColor }]} />
          )}

          <View style={tw`flex-1 mr-2`}>
            <View style={tw`flex-row items-center`}>
              <Text variant="medium" style={[tw`text-gray-900 flex-1`, typography.bodyMedium]} numberOfLines={1}>
                {item.menuItemName}
              </Text>
              {statusBadge && (
                <View style={tw`${statusBadge.bg} px-2 py-0.5 rounded ml-2`}>
                  <Text style={[tw`${statusBadge.text}`, { fontSize: 11, fontFamily: 'Geist-Bold' }]}>{statusBadge.label}</Text>
                </View>
              )}
            </View>
            {item.modifiers && item.modifiers.length > 0 && (
              <Text style={[tw`text-gray-400`, typography.small]} numberOfLines={1}>
                + {item.modifiers.map((m) => m.modifierName).join(', ')}
              </Text>
            )}
            {item.specialRequests ? (
              <TouchableOpacity
                onPress={() => isOpen && isUnfired && onEditNote?.(item)}
                disabled={!isOpen || !isUnfired}
                activeOpacity={0.6}
                style={tw`flex-row items-center mt-0.5`}
              >
                <MaterialCommunityIcons name="note-edit-outline" size={12} color="#EA580C" />
                <Text style={[tw`text-orange-500 ml-1 flex-1`, typography.small]} numberOfLines={1}>
                  {item.specialRequests}
                </Text>
                {isOpen && isUnfired && (
                  <MaterialCommunityIcons name="pencil" size={10} color="#FB923C" style={tw`ml-1`} />
                )}
              </TouchableOpacity>
            ) : isOpen && isUnfired && onEditNote ? (
              <TouchableOpacity
                onPress={() => onEditNote(item)}
                activeOpacity={0.6}
                style={tw`flex-row items-center mt-0.5`}
              >
                <MaterialCommunityIcons name="note-plus-outline" size={12} color="#9CA3AF" />
                <Text style={[tw`text-gray-400 ml-1`, typography.small]}>Add note</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isOpen && isUnfired ? (
            <View style={tw`flex-row items-center bg-gray-50 rounded-lg overflow-hidden`}>
              <TouchableOpacity
                onPress={handleDecrement}
                style={tw`w-9 h-9 items-center justify-center`}
                hitSlop={{ top: 6, right: 2, bottom: 6, left: 6 }}
              >
                <MaterialCommunityIcons
                  name={item.quantity <= 1 ? 'delete-outline' : 'minus'}
                  size={16}
                  color={item.quantity <= 1 ? colors.status.error : '#6B7280'}
                />
              </TouchableOpacity>
              <Text variant="semibold" style={[tw`text-gray-900 min-w-[24px] text-center`, typography.bodySemibold]}>
                {item.quantity}
              </Text>
              <TouchableOpacity
                onPress={handleIncrement}
                style={tw`w-9 h-9 items-center justify-center`}
                hitSlop={{ top: 6, left: 2, bottom: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="plus" size={16} color={colors.primary.main} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw`px-2.5 py-1 bg-gray-100 rounded`}>
              <Text style={[tw`text-gray-700`, typography.caption]}>x{item.quantity}</Text>
            </View>
          )}

          <Text variant="medium" style={[tw`text-gray-900 ml-3 min-w-[64px] text-right`, typography.bodySemibold]}>
            R{(item.totalPrice ?? 0).toFixed(2)}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

function getStatusBadge(
  item: CheckItem,
  isUnfired: boolean,
  isSent: boolean,
): { bg: string; text: string; label: string } | null {
  if (isSent) return { bg: 'bg-orange-50', text: 'text-orange-600', label: 'SENT' };
  if (isUnfired) return { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'NEW' };
  if (item.status === 'PREPARING') return { bg: 'bg-blue-50', text: 'text-blue-600', label: 'PREP' };
  if (item.status === 'READY') return { bg: 'bg-green-50', text: 'text-green-700', label: 'READY' };
  if (item.status === 'SERVED') return { bg: 'bg-gray-50', text: 'text-gray-500', label: 'SERVED' };
  return null;
}

function getStatusDotColor(
  item: CheckItem,
  isUnfired: boolean,
  isSent: boolean,
): string | null {
  if (isUnfired) return '#EAB308';
  if (isSent) return '#EA580C';
  if (item.status === 'PREPARING') return colors.primary.main;
  if (item.status === 'READY') return '#16A34A';
  if (item.status === 'SERVED') return '#9CA3AF';
  return null;
}

const styles = StyleSheet.create({
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Geist-Medium',
  },
});
