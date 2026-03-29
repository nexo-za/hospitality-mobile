import React, { useState, useCallback, useEffect } from 'react';
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
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import type { CheckItem, CourseType, DiscountType } from '@/types/hospitality';

type ActiveAction = 'void' | 'discount' | 'seat' | 'course' | null;

const COURSE_OPTIONS: { label: string; value: CourseType }[] = [
  { label: 'Appetizer', value: 'APPETIZER' },
  { label: 'Soup', value: 'SOUP' },
  { label: 'Salad', value: 'SALAD' },
  { label: 'Entrée', value: 'ENTREE' },
  { label: 'Dessert', value: 'DESSERT' },
  { label: 'Beverage', value: 'BEVERAGE' },
  { label: 'Custom', value: 'CUSTOM' },
];

const VOID_REASON_CODES = [
  { label: 'Customer request', value: 'CUSTOMER_REQUEST' },
  { label: 'Kitchen error', value: 'KITCHEN_ERROR' },
  { label: 'Wrong item', value: 'WRONG_ITEM' },
  { label: 'Quality issue', value: 'QUALITY_ISSUE' },
  { label: 'Other', value: 'OTHER' },
];

interface ItemActionSheetProps {
  visible: boolean;
  item: CheckItem | null;
  onClose: () => void;
  onVoid: (itemId: number, reasonCode: string, reasonText?: string) => void;
  onDiscount: (itemId: number, discountType: DiscountType, value: number) => void;
  onRepeat: (item: CheckItem) => void;
  onUpdateSeat: (itemId: number, seatNumber: number) => void;
  onUpdateCourse: (itemId: number, courseNumber: number) => void;
  onMarkServed?: (itemId: number) => void;
  onEditNote?: (item: CheckItem) => void;
}

export function ItemActionSheet({
  visible,
  item,
  onClose,
  onVoid,
  onDiscount,
  onRepeat,
  onUpdateSeat,
  onUpdateCourse,
  onMarkServed,
  onEditNote,
}: ItemActionSheetProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [voidReasonCode, setVoidReasonCode] = useState('');
  const [voidReasonText, setVoidReasonText] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number | null>(null);

  const resetState = useCallback(() => {
    setActiveAction(null);
    setVoidReasonCode('');
    setVoidReasonText('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setSeatNumber('');
    setSelectedCourseIndex(null);
  }, []);

  useEffect(() => {
    if (!visible) resetState();
  }, [visible, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleVoidConfirm = useCallback(() => {
    if (!item || !voidReasonCode) return;
    onVoid(item.id, voidReasonCode, voidReasonText || undefined);
    handleClose();
  }, [item, voidReasonCode, voidReasonText, onVoid, handleClose]);

  const handleDiscountConfirm = useCallback(() => {
    if (!item || !discountValue) return;
    const parsed = parseFloat(discountValue);
    if (isNaN(parsed) || parsed <= 0) return;
    onDiscount(item.id, discountType, parsed);
    handleClose();
  }, [item, discountType, discountValue, onDiscount, handleClose]);

  const handleRepeat = useCallback(() => {
    if (!item) return;
    onRepeat(item);
    handleClose();
  }, [item, onRepeat, handleClose]);

  const handleMarkServed = useCallback(() => {
    if (!item || !onMarkServed) return;
    onMarkServed(item.id);
    handleClose();
  }, [item, onMarkServed, handleClose]);

  const handleSeatConfirm = useCallback(() => {
    if (!item || !seatNumber) return;
    const parsed = parseInt(seatNumber, 10);
    if (isNaN(parsed) || parsed < 1) return;
    onUpdateSeat(item.id, parsed);
    handleClose();
  }, [item, seatNumber, onUpdateSeat, handleClose]);

  const handleCourseConfirm = useCallback(() => {
    if (!item || selectedCourseIndex === null) return;
    onUpdateCourse(item.id, selectedCourseIndex + 1);
    handleClose();
  }, [item, selectedCourseIndex, onUpdateCourse, handleClose]);

  if (!item) return null;

  const isVoided = item.status === 'VOIDED';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={tw`flex-1 bg-black/50`} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw`flex-1 justify-end`}
        >
          <Pressable
            style={tw`bg-white rounded-t-[20px] max-h-[85%]`}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View style={tw`items-center pt-3 pb-1`}>
              <View style={tw`w-10 h-1 rounded-full bg-neutral-border`} />
            </View>

            {/* Header */}
            <View style={tw`flex-row items-center justify-between px-5 py-3 border-b border-neutral-border`}>
              <View style={tw`flex-1 mr-3`}>
                <Text variant="semibold" style={[typography.h3, tw`text-black`]}>
                  {item.menuItemName}
                </Text>
                <Text style={[typography.caption, tw`text-neutral-darkGray mt-0.5`]}>
                  Qty: {item.quantity} · R{(item.totalPrice ?? 0).toFixed(2)}
                  {item.variantName ? ` · ${item.variantName}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={22} color={colors.neutral.darkGray} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={tw`px-5`}
              contentContainerStyle={tw`pb-8`}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Void Item */}
              {!isVoided && (
                <ActionRow
                  icon="cancel"
                  label="Void Item"
                  color={colors.status.error}
                  expanded={activeAction === 'void'}
                  onPress={() => setActiveAction(activeAction === 'void' ? null : 'void')}
                >
                  <View style={tw`mt-3`}>
                    <Text variant="medium" style={[typography.captionMedium, tw`mb-2`]}>
                      Reason
                    </Text>
                    <View style={tw`flex-row flex-wrap gap-2 mb-3`}>
                      {VOID_REASON_CODES.map((r) => (
                        <TouchableOpacity
                          key={r.value}
                          onPress={() => setVoidReasonCode(r.value)}
                          style={[
                            tw`px-3 py-1.5 rounded-full border`,
                            voidReasonCode === r.value
                              ? tw`bg-status-error border-status-error`
                              : tw`border-neutral-border`,
                          ]}
                        >
                          <Text
                            style={[
                              typography.small,
                              voidReasonCode === r.value ? tw`text-white` : tw`text-neutral-darkGray`,
                            ]}
                          >
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={[
                        tw`border border-neutral-border rounded-lg px-3 py-2.5`,
                        typography.caption,
                      ]}
                      placeholder="Additional notes (optional)"
                      placeholderTextColor={colors.neutral.darkGray}
                      value={voidReasonText}
                      onChangeText={setVoidReasonText}
                    />
                    <ConfirmButton
                      label="Confirm Void"
                      disabled={!voidReasonCode}
                      onPress={handleVoidConfirm}
                      destructive
                    />
                  </View>
                </ActionRow>
              )}

              {/* Apply Discount */}
              {!isVoided && (
                <ActionRow
                  icon="tag-outline"
                  label="Apply Discount"
                  color={colors.primary.main}
                  expanded={activeAction === 'discount'}
                  onPress={() => setActiveAction(activeAction === 'discount' ? null : 'discount')}
                >
                  <View style={tw`mt-3`}>
                    <View style={tw`flex-row gap-2 mb-3`}>
                      {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setDiscountType(t)}
                          style={[
                            tw`flex-1 py-2 rounded-lg border items-center`,
                            discountType === t
                              ? tw`bg-primary-main border-primary-main`
                              : tw`border-neutral-border`,
                          ]}
                        >
                          <Text
                            variant="medium"
                            style={[
                              typography.captionMedium,
                              discountType === t ? tw`text-white` : tw`text-neutral-darkGray`,
                            ]}
                          >
                            {t === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={[
                        tw`border border-neutral-border rounded-lg px-3 py-2.5`,
                        typography.caption,
                      ]}
                      placeholder={discountType === 'PERCENTAGE' ? 'Enter % (e.g. 10)' : 'Enter amount (e.g. 25.00)'}
                      placeholderTextColor={colors.neutral.darkGray}
                      keyboardType="decimal-pad"
                      value={discountValue}
                      onChangeText={setDiscountValue}
                    />
                    <ConfirmButton
                      label="Apply Discount"
                      disabled={!discountValue || parseFloat(discountValue) <= 0}
                      onPress={handleDiscountConfirm}
                    />
                  </View>
                </ActionRow>
              )}

              {/* Repeat Item */}
              {!isVoided && (
                <ActionRow
                  icon="content-copy"
                  label="Repeat Item"
                  color={colors.primary.main}
                  onPress={handleRepeat}
                />
              )}

              {/* Special Instructions */}
              {!isVoided && onEditNote && item.firingStatus === 'FIRE_HOLD' && (
                <ActionRow
                  icon="note-edit-outline"
                  label={item.specialRequests ? 'Edit Special Instructions' : 'Add Special Instructions'}
                  color="#EA580C"
                  onPress={() => {
                    handleClose();
                    setTimeout(() => onEditNote(item), 300);
                  }}
                />
              )}

              {/* Mark Served — only for items that are READY or PREPARING */}
              {onMarkServed && !isVoided && (item?.status === 'READY' || item?.status === 'PREPARING') && (
                <ActionRow
                  icon="check-circle-outline"
                  label="Mark Served"
                  color="#16A34A"
                  onPress={handleMarkServed}
                />
              )}

              {/* Change Seat */}
              <ActionRow
                icon="seat-outline"
                label="Change Seat"
                color={colors.primary.main}
                expanded={activeAction === 'seat'}
                onPress={() => setActiveAction(activeAction === 'seat' ? null : 'seat')}
              >
                <View style={tw`mt-3`}>
                  <TextInput
                    style={[
                      tw`border border-neutral-border rounded-lg px-3 py-2.5`,
                      typography.caption,
                    ]}
                    placeholder="Seat number"
                    placeholderTextColor={colors.neutral.darkGray}
                    keyboardType="number-pad"
                    value={seatNumber}
                    onChangeText={setSeatNumber}
                  />
                  <ConfirmButton
                    label="Update Seat"
                    disabled={!seatNumber || parseInt(seatNumber, 10) < 1}
                    onPress={handleSeatConfirm}
                  />
                </View>
              </ActionRow>

              {/* Change Course */}
              <ActionRow
                icon="silverware-fork-knife"
                label="Change Course"
                color={colors.primary.main}
                expanded={activeAction === 'course'}
                onPress={() => setActiveAction(activeAction === 'course' ? null : 'course')}
              >
                <View style={tw`mt-3 flex-row flex-wrap gap-2`}>
                  {COURSE_OPTIONS.map((c, idx) => (
                    <TouchableOpacity
                      key={c.value}
                      onPress={() => setSelectedCourseIndex(idx)}
                      style={[
                        tw`px-3 py-2 rounded-lg border`,
                        selectedCourseIndex === idx
                          ? tw`bg-primary-main border-primary-main`
                          : tw`border-neutral-border`,
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          selectedCourseIndex === idx ? tw`text-white` : tw`text-neutral-darkGray`,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ConfirmButton
                  label="Update Course"
                  disabled={selectedCourseIndex === null}
                  onPress={handleCourseConfirm}
                />
              </ActionRow>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

interface ActionRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  color: string;
  expanded?: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}

function ActionRow({ icon, label, color, expanded, onPress, children }: ActionRowProps) {
  return (
    <View style={tw`border-b border-neutral-border`}>
      <TouchableOpacity
        style={tw`flex-row items-center py-4`}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            tw`w-9 h-9 rounded-full items-center justify-center mr-3`,
            { backgroundColor: `${color}14` },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text variant="medium" style={[typography.bodyMedium, tw`flex-1`]}>
          {label}
        </Text>
        {children !== undefined && (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-right'}
            size={20}
            color={colors.neutral.darkGray}
          />
        )}
      </TouchableOpacity>
      {expanded && children}
    </View>
  );
}

interface ConfirmButtonProps {
  label: string;
  disabled: boolean;
  onPress: () => void;
  destructive?: boolean;
}

function ConfirmButton({ label, disabled, onPress, destructive }: ConfirmButtonProps) {
  const bg = destructive ? 'bg-status-error' : 'bg-primary-main';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        tw`mt-3 mb-1 py-3 rounded-lg items-center ${bg}`,
        disabled && tw`opacity-40`,
      ]}
      activeOpacity={0.8}
    >
      <Text variant="semibold" style={[typography.captionSemibold, tw`text-white`]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
