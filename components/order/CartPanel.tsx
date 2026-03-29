import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import { SwipeableCartItem } from './SwipeableCartItem';
import type { Check, CheckItem } from '@/types/hospitality';

interface GuestProfile {
  firstName?: string;
  lastName?: string;
  isVIP?: boolean;
  phone?: string;
  email?: string;
  tags?: string[];
  totalVisits?: number;
}

interface CartPanelProps {
  check: Check;
  isOpen: boolean;
  isFiring: boolean;
  unfiredCount: number;
  onEditCheck: () => void;
  onQuantityChange: (itemId: number, newQuantity: number) => void;
  onVoidItem: (item: CheckItem) => void;
  onRepeatItem: (item: CheckItem) => void;
  onMoreActions: (item: CheckItem) => void;
  onRemoveItem: (itemId: number) => void;
  onFire: () => void;
  onPayment: () => void;
}

const COURSE_LABELS: Record<number, string> = {
  1: 'Appetizer',
  2: 'Soup',
  3: 'Salad',
  4: 'Entrée',
  5: 'Dessert',
  6: 'Beverage',
  7: 'Custom',
};

export function CartPanel({
  check,
  isOpen,
  isFiring,
  unfiredCount,
  onEditCheck,
  onQuantityChange,
  onVoidItem,
  onRepeatItem,
  onMoreActions,
  onRemoveItem,
  onFire,
  onPayment,
}: CartPanelProps) {
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const guest = (check as any).guestProfile as GuestProfile | null;

  const activeItems = useMemo(
    () => (check.items || []).filter((i) => i.status !== 'VOIDED'),
    [check.items],
  );

  const groupedByCourse = useMemo(() => {
    const hasCourses = activeItems.some((i) => i.courseNumber && i.courseNumber > 0);
    if (!hasCourses) return null;

    const groups = new Map<number, CheckItem[]>();
    const uncategorized: CheckItem[] = [];

    activeItems.forEach((item) => {
      if (item.courseNumber && item.courseNumber > 0) {
        const existing = groups.get(item.courseNumber) || [];
        existing.push(item);
        groups.set(item.courseNumber, existing);
      } else {
        uncategorized.push(item);
      }
    });

    const sorted = Array.from(groups.entries()).sort(([a], [b]) => a - b);
    if (uncategorized.length > 0) {
      sorted.push([0, uncategorized]);
    }
    return sorted;
  }, [activeItems]);

  const renderSwipeHint = useCallback(() => {
    if (activeItems.length === 0 || !isOpen) return null;
    return (
      <View style={tw`flex-row items-center justify-center py-1.5 bg-gray-50`}>
        <MaterialCommunityIcons name="gesture-swipe-horizontal" size={14} color="#9CA3AF" />
        <Text style={tw`text-gray-400 text-[10px] ml-1`}>Swipe items for quick actions</Text>
      </View>
    );
  }, [activeItems.length, isOpen]);

  const renderItem = useCallback(
    (item: CheckItem) => (
      <SwipeableCartItem
        key={`cart-${item.id}`}
        item={item}
        isOpen={isOpen}
        onQuantityChange={onQuantityChange}
        onVoidPress={onVoidItem}
        onRepeatPress={onRepeatItem}
        onMorePress={onMoreActions}
        onRemove={onRemoveItem}
      />
    ),
    [isOpen, onQuantityChange, onVoidItem, onRepeatItem, onMoreActions, onRemoveItem],
  );

  const renderCourseGroup = useCallback(
    (courseNumber: number, items: CheckItem[]) => (
      <View key={`course-${courseNumber}`}>
        <View style={tw`flex-row items-center px-3 py-1.5 bg-gray-50`}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={12} color="#9CA3AF" />
          <Text variant="medium" style={tw`text-gray-500 text-[11px] ml-1.5 uppercase tracking-wider`}>
            {courseNumber === 0 ? 'No Course' : COURSE_LABELS[courseNumber] || `Course ${courseNumber}`}
          </Text>
          <Text style={tw`text-gray-400 text-[11px] ml-1`}>({items.length})</Text>
        </View>
        {items.map(renderItem)}
      </View>
    ),
    [renderItem],
  );

  return (
    <View style={tw`flex-1`}>
      {/* Compact Header */}
      <TouchableOpacity
        style={tw`px-3 py-2.5 bg-white border-b border-gray-100`}
        onPress={() => setHeaderExpanded(!headerExpanded)}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center`}>
          <View style={tw`h-7 w-7 rounded-full ${guest ? 'bg-blue-100' : 'bg-gray-100'} items-center justify-center mr-2`}>
            {guest ? (
              <Text style={tw`text-blue-700 text-xs font-bold`}>{(guest.firstName || '?')[0].toUpperCase()}</Text>
            ) : (
              <MaterialCommunityIcons name="silverware-variant" size={14} color={colors.primary.main} />
            )}
          </View>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center`}>
              <Text variant="semibold" style={[tw`text-gray-900`, typography.caption]}>
                {check.tableName || `Table ${check.tableId || 'N/A'}`}
              </Text>
              {guest?.isVIP && (
                <View style={tw`bg-amber-100 rounded px-1 py-0.5 ml-1.5`}>
                  <Text style={tw`text-amber-700 text-[8px] font-bold`}>VIP</Text>
                </View>
              )}
              <Text style={tw`text-gray-400 text-xs ml-1.5`}>
                · {check.guestCount}p{check.serverName ? ` · ${check.serverName}` : ''}
              </Text>
            </View>
            {guest && (
              <Text style={tw`text-gray-500 text-[11px]`}>
                {guest.firstName} {guest.lastName || ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onEditCheck}
            style={tw`p-1.5 rounded-full bg-gray-50`}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color="#6B7280" />
          </TouchableOpacity>
          <MaterialCommunityIcons
            name={headerExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#9CA3AF"
            style={tw`ml-1`}
          />
        </View>
        {headerExpanded && (
          <View style={tw`mt-2 pt-2 border-t border-gray-100`}>
            <View style={tw`flex-row`}>
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-400 text-[10px] uppercase`}>Check #</Text>
                <Text variant="medium" style={tw`text-gray-700 text-xs`}>{check.checkNumber}</Text>
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-400 text-[10px] uppercase`}>Type</Text>
                <Text variant="medium" style={tw`text-gray-700 text-xs`}>{check.checkType?.replace('_', ' ')}</Text>
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-400 text-[10px] uppercase`}>Items</Text>
                <Text variant="medium" style={tw`text-gray-700 text-xs`}>{activeItems.length}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {renderSwipeHint()}

      {/* Items List */}
      <GestureHandlerRootView style={tw`flex-1`}>
        <ScrollView style={tw`flex-1`} contentContainerStyle={activeItems.length === 0 ? tw`flex-1` : undefined}>
          {activeItems.length === 0 ? (
            <View style={tw`flex-1 justify-center items-center p-6`}>
              <MaterialCommunityIcons name="cart-outline" size={40} color="#D1D5DB" />
              <Text style={tw`text-gray-400 mt-3 text-center text-sm`}>
                Tap menu items to add
              </Text>
            </View>
          ) : groupedByCourse ? (
            groupedByCourse.map(([courseNum, items]) => renderCourseGroup(courseNum, items))
          ) : (
            activeItems.map(renderItem)
          )}
        </ScrollView>
      </GestureHandlerRootView>

      {/* Fire Button - Floating overlay when unfired items exist */}
      {isOpen && unfiredCount > 0 && (
        <TouchableOpacity
          style={[
            tw`absolute right-3 rounded-full flex-row items-center px-4 py-2.5 shadow-lg`,
            { bottom: 180, backgroundColor: '#EA580C', elevation: 6 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onFire();
          }}
          disabled={isFiring}
          activeOpacity={0.8}
        >
          {isFiring ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialCommunityIcons name="fire" size={18} color="white" />
          )}
          <Text variant="semibold" style={tw`text-white text-xs ml-1.5`}>
            {isFiring ? 'Sending...' : `Fire (${unfiredCount})`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Totals & Payment Footer */}
      <View style={tw`bg-white border-t border-gray-100 px-3 pt-2 pb-3`}>
        <View style={tw`flex-row justify-between mb-1`}>
          <Text style={tw`text-gray-500 text-xs`}>Subtotal</Text>
          <Text style={tw`text-gray-700 text-xs`}>R{check.subtotal?.toFixed(2) || '0.00'}</Text>
        </View>
        {(check.discountAmount ?? 0) > 0 && (
          <View style={tw`flex-row justify-between mb-1`}>
            <Text style={tw`text-gray-500 text-xs`}>Discount</Text>
            <Text style={tw`text-red-500 text-xs`}>-R{check.discountAmount?.toFixed(2)}</Text>
          </View>
        )}
        <View style={tw`flex-row justify-between mb-1`}>
          <Text style={tw`text-gray-500 text-xs`}>Tax (15%)</Text>
          <Text style={tw`text-gray-700 text-xs`}>R{check.taxAmount?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={tw`flex-row justify-between mb-3 pt-1.5 border-t border-gray-100`}>
          <Text variant="bold" style={tw`text-gray-900 text-base`}>Total</Text>
          <Text variant="bold" style={tw`text-gray-900 text-base`}>
            R{check.totalAmount?.toFixed(2) || '0.00'}
          </Text>
        </View>

        {isOpen && (
          <TouchableOpacity
            style={[
              tw`py-3 rounded-xl items-center`,
              { backgroundColor: colors.primary.main },
              activeItems.length === 0 && tw`opacity-40`,
            ]}
            onPress={onPayment}
            disabled={activeItems.length === 0}
            activeOpacity={0.8}
          >
            <Text variant="semibold" style={tw`text-white text-sm`}>Process Payment</Text>
          </TouchableOpacity>
        )}

        {check.status === 'CLOSED' && (check.balanceDue ?? 0) > 0 && (
          <TouchableOpacity
            style={[tw`py-3 rounded-xl items-center`, { backgroundColor: colors.primary.main }]}
            onPress={onPayment}
            activeOpacity={0.8}
          >
            <Text variant="semibold" style={tw`text-white text-sm`}>
              Pay Balance (R{check.balanceDue?.toFixed(2)})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
