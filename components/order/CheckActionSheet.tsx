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
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { colors } from '@/styles/theme/tokens';
import type { Check, DiscountType, ServiceChargeType } from '@/types/hospitality';

type ActiveAction = 'discount' | 'serviceCharge' | 'voidCheck' | null;

interface CheckActionSheetProps {
  visible: boolean;
  check: Check | null;
  onClose: () => void;
  onTransfer: () => void;
  onSplit: () => void;
  onDiscount: (name: string, discountType: DiscountType, value: number) => void;
  onServiceCharge: (name: string, chargeType: ServiceChargeType, value: number) => void;
  onVoidCheck: (reason: string) => void;
  onReopenCheck: () => void;
}

export function CheckActionSheet({
  visible,
  check,
  onClose,
  onTransfer,
  onSplit,
  onDiscount,
  onServiceCharge,
  onVoidCheck,
  onReopenCheck,
}: CheckActionSheetProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  const [discountName, setDiscountName] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');

  const [chargeName, setChargeName] = useState('');
  const [chargeType, setChargeType] = useState<ServiceChargeType>('PERCENTAGE');
  const [chargeValue, setChargeValue] = useState('');

  const [voidReason, setVoidReason] = useState('');

  const resetState = useCallback(() => {
    setActiveAction(null);
    setDiscountName('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setChargeName('');
    setChargeType('PERCENTAGE');
    setChargeValue('');
    setVoidReason('');
  }, []);

  useEffect(() => {
    if (!visible) resetState();
  }, [visible, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleTransfer = useCallback(() => {
    onTransfer();
    handleClose();
  }, [onTransfer, handleClose]);

  const handleSplit = useCallback(() => {
    onSplit();
    handleClose();
  }, [onSplit, handleClose]);

  const handleDiscountConfirm = useCallback(() => {
    if (!discountName.trim() || !discountValue) return;
    const parsed = parseFloat(discountValue);
    if (isNaN(parsed) || parsed <= 0) return;
    onDiscount(discountName.trim(), discountType, parsed);
    handleClose();
  }, [discountName, discountType, discountValue, onDiscount, handleClose]);

  const handleChargeConfirm = useCallback(() => {
    if (!chargeName.trim() || !chargeValue) return;
    const parsed = parseFloat(chargeValue);
    if (isNaN(parsed) || parsed <= 0) return;
    onServiceCharge(chargeName.trim(), chargeType, parsed);
    handleClose();
  }, [chargeName, chargeType, chargeValue, onServiceCharge, handleClose]);

  const handleVoidConfirm = useCallback(() => {
    if (!voidReason.trim()) return;
    onVoidCheck(voidReason.trim());
    handleClose();
  }, [voidReason, onVoidCheck, handleClose]);

  const handleReopen = useCallback(() => {
    Alert.alert(
      'Reopen Check',
      `Are you sure you want to reopen check #${check?.checkNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: () => {
            onReopenCheck();
            handleClose();
          },
        },
      ],
    );
  }, [check, onReopenCheck, handleClose]);

  if (!check) return null;

  const isOpen = check.status === 'OPEN' || check.status === 'REOPENED';
  const canReopen = check.status === 'CLOSED' || check.status === 'VOIDED';

  const statusColor: Record<string, string> = {
    OPEN: colors.status.success,
    PRINTED: colors.status.info,
    PARTIALLY_PAID: colors.status.warning,
    CLOSED: colors.neutral.darkGray,
    VOIDED: colors.status.error,
    REOPENED: colors.status.success,
    TRANSFERRED: colors.status.info,
  };

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
                <View style={tw`flex-row items-center`}>
                  <Text variant="semibold" style={[typography.h3, tw`text-black`]}>
                    Check #{check.checkNumber}
                  </Text>
                  <View
                    style={[
                      tw`ml-2 px-2 py-0.5 rounded-full`,
                      { backgroundColor: `${statusColor[check.status] ?? colors.neutral.darkGray}18` },
                    ]}
                  >
                    <Text
                      variant="medium"
                      style={[
                        typography.small,
                        { color: statusColor[check.status] ?? colors.neutral.darkGray },
                      ]}
                    >
                      {check.status}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.caption, tw`text-neutral-darkGray mt-0.5`]}>
                  {check.tableName ? `${check.tableName} · ` : ''}
                  {check.guestCount} guest{check.guestCount !== 1 ? 's' : ''} · R{(check.totalAmount ?? 0).toFixed(2)}
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
              {/* Transfer Check */}
              {isOpen && (
                <ActionRow
                  icon="swap-horizontal"
                  label="Transfer Check"
                  color={colors.primary.main}
                  onPress={handleTransfer}
                />
              )}

              {/* Split Check */}
              {isOpen && (
                <ActionRow
                  icon="call-split"
                  label="Split Check"
                  color={colors.primary.main}
                  onPress={handleSplit}
                />
              )}

              {/* Apply Discount */}
              {isOpen && (
                <ActionRow
                  icon="tag-outline"
                  label="Apply Discount"
                  color={colors.primary.main}
                  expanded={activeAction === 'discount'}
                  onPress={() => setActiveAction(activeAction === 'discount' ? null : 'discount')}
                >
                  <View style={tw`mt-3`}>
                    <TextInput
                      style={[
                        tw`border border-neutral-border rounded-lg px-3 py-2.5 mb-3`,
                        typography.caption,
                      ]}
                      placeholder="Discount name"
                      placeholderTextColor={colors.neutral.darkGray}
                      value={discountName}
                      onChangeText={setDiscountName}
                    />
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
                      placeholder={discountType === 'PERCENTAGE' ? 'Enter % (e.g. 10)' : 'Enter amount (e.g. 50.00)'}
                      placeholderTextColor={colors.neutral.darkGray}
                      keyboardType="decimal-pad"
                      value={discountValue}
                      onChangeText={setDiscountValue}
                    />
                    <ConfirmButton
                      label="Apply Discount"
                      disabled={!discountName.trim() || !discountValue || parseFloat(discountValue) <= 0}
                      onPress={handleDiscountConfirm}
                    />
                  </View>
                </ActionRow>
              )}

              {/* Add Service Charge */}
              {isOpen && (
                <ActionRow
                  icon="cash-plus"
                  label="Add Service Charge"
                  color={colors.primary.main}
                  expanded={activeAction === 'serviceCharge'}
                  onPress={() => setActiveAction(activeAction === 'serviceCharge' ? null : 'serviceCharge')}
                >
                  <View style={tw`mt-3`}>
                    <TextInput
                      style={[
                        tw`border border-neutral-border rounded-lg px-3 py-2.5 mb-3`,
                        typography.caption,
                      ]}
                      placeholder="Charge name (e.g. Gratuity)"
                      placeholderTextColor={colors.neutral.darkGray}
                      value={chargeName}
                      onChangeText={setChargeName}
                    />
                    <View style={tw`flex-row gap-2 mb-3`}>
                      {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setChargeType(t)}
                          style={[
                            tw`flex-1 py-2 rounded-lg border items-center`,
                            chargeType === t
                              ? tw`bg-primary-main border-primary-main`
                              : tw`border-neutral-border`,
                          ]}
                        >
                          <Text
                            variant="medium"
                            style={[
                              typography.captionMedium,
                              chargeType === t ? tw`text-white` : tw`text-neutral-darkGray`,
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
                      placeholder={chargeType === 'PERCENTAGE' ? 'Enter % (e.g. 10)' : 'Enter amount (e.g. 25.00)'}
                      placeholderTextColor={colors.neutral.darkGray}
                      keyboardType="decimal-pad"
                      value={chargeValue}
                      onChangeText={setChargeValue}
                    />
                    <ConfirmButton
                      label="Add Service Charge"
                      disabled={!chargeName.trim() || !chargeValue || parseFloat(chargeValue) <= 0}
                      onPress={handleChargeConfirm}
                    />
                  </View>
                </ActionRow>
              )}

              {/* Void Check */}
              {isOpen && (
                <ActionRow
                  icon="close-circle-outline"
                  label="Void Check"
                  color={colors.status.error}
                  expanded={activeAction === 'voidCheck'}
                  onPress={() => setActiveAction(activeAction === 'voidCheck' ? null : 'voidCheck')}
                >
                  <View style={tw`mt-3`}>
                    <TextInput
                      style={[
                        tw`border border-neutral-border rounded-lg px-3 py-2.5`,
                        typography.caption,
                      ]}
                      placeholder="Reason for voiding this check"
                      placeholderTextColor={colors.neutral.darkGray}
                      value={voidReason}
                      onChangeText={setVoidReason}
                      multiline
                      numberOfLines={2}
                    />
                    <ConfirmButton
                      label="Confirm Void"
                      disabled={!voidReason.trim()}
                      onPress={handleVoidConfirm}
                      destructive
                    />
                  </View>
                </ActionRow>
              )}

              {/* Reopen Check */}
              {canReopen && (
                <ActionRow
                  icon="lock-open-outline"
                  label="Reopen Check"
                  color={colors.status.warning}
                  onPress={handleReopen}
                />
              )}
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
