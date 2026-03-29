import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useCashTill } from '@/contexts/CashTillContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/api/api';
import type { CashEventType, CashEvent } from '@/types/hospitality';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface ActionDef {
  label: string;
  eventType: CashEventType;
  color: string;
  bg: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

const ACTIONS: ActionDef[] = [
  { label: 'Pay In', eventType: 'PAID_IN', color: '#16A34A', bg: '#F0FDF4', icon: 'cash-plus' },
  { label: 'Pay Out', eventType: 'PAID_OUT', color: '#DC2626', bg: '#FEF2F2', icon: 'cash-minus' },
  { label: 'Cash Drop', eventType: 'CASH_DROP', color: '#2563EB', bg: '#EFF6FF', icon: 'safe' },
  { label: 'Safe Drop', eventType: 'SAFE_DROP', color: '#4F46E5', bg: '#EEF2FF', icon: 'shield-lock' },
];

const EVENT_BADGE: Record<string, { color: string; bg: string }> = {
  PAID_IN: { color: '#16A34A', bg: '#DCFCE7' },
  PAID_OUT: { color: '#DC2626', bg: '#FEE2E2' },
  CASH_DROP: { color: '#2563EB', bg: '#DBEAFE' },
  SAFE_DROP: { color: '#4F46E5', bg: '#E0E7FF' },
  FLOAT_ADJUSTMENT: { color: '#CA8A04', bg: '#FEF9C3' },
};

function formatEventType(t: string) {
  return t.replace(/_/g, ' ');
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(v: number) {
  return `R${v.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Summary Row
// ---------------------------------------------------------------------------
function SummaryRow({ label, value, bold, color }: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={tw`flex-row justify-between py-1.5`}>
      <Text style={[tw`text-sm text-gray-600`, typography.body]}>{label}</Text>
      <Text
        style={[
          tw`text-sm`,
          bold ? typography.headingSemibold : typography.bodySemibold,
          { color: color ?? '#111827' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Action Modal
// ---------------------------------------------------------------------------
interface ActionModalProps {
  visible: boolean;
  action: ActionDef | null;
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => Promise<void>;
}

function ActionModal({ visible, action, onClose, onSubmit }: ActionModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setAmount('');
    setReason('');
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      Alert.alert('Invalid', 'Enter a valid amount greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed, reason.trim());
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!action) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw`flex-1 justify-end bg-black/50`}
      >
        <View style={tw`bg-white rounded-t-3xl px-5 pt-6 pb-8`}>
          <View style={tw`flex-row items-center mb-5`}>
            <View
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                { backgroundColor: action.bg },
              ]}
            >
              <MaterialCommunityIcons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={[tw`text-lg`, typography.headingSemibold]}>{action.label}</Text>
          </View>

          <Text style={[tw`text-sm text-gray-500 mb-1`, typography.bodySemibold]}>Amount (R)</Text>
          <TextInput
            style={[
              tw`border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base bg-gray-50`,
              typography.body,
            ]}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          <Text style={[tw`text-sm text-gray-500 mb-1`, typography.bodySemibold]}>
            Reason (optional)
          </Text>
          <TextInput
            style={[
              tw`border border-gray-200 rounded-xl px-4 py-3 mb-6 text-base bg-gray-50`,
              typography.body,
            ]}
            placeholder="Enter reason..."
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity
            style={[
              tw`rounded-xl py-3.5 items-center mb-3`,
              { backgroundColor: action.color, opacity: submitting ? 0.6 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
              {submitting ? 'Processing...' : `Submit ${action.label}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={tw`rounded-xl py-3 items-center`} onPress={handleClose}>
            <Text style={[tw`text-gray-500 text-base`, typography.bodySemibold]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function CashTillScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    drawers,
    events,
    shiftSummary,
    isLoading,
    loadDrawers,
    loadEvents,
    loadShiftSummary,
    recordEvent,
  } = useCashTill();

  const [modalAction, setModalAction] = useState<ActionDef | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);

  const storeId = (user as any)?.storeId as number | undefined;

  const fetchActiveShift = useCallback(async () => {
    try {
      const res = await api.get('/shifts/active');
      const id = res.data?.data?.shift?.id ?? null;
      setActiveShiftId(id);
      return id as number | null;
    } catch {
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (!storeId) return;
    loadDrawers(storeId);
    loadEvents({ storeId });
    const shiftId = await fetchActiveShift();
    if (shiftId) loadShiftSummary(shiftId);
  }, [storeId, loadDrawers, loadEvents, fetchActiveShift, loadShiftSummary]);

  useEffect(() => {
    loadAll();
  }, []);

  const handleSubmitEvent = useCallback(
    async (eventType: CashEventType, amount: number, reason: string) => {
      let shiftId = activeShiftId;
      if (!shiftId) {
        shiftId = await fetchActiveShift();
      }
      if (!shiftId || !storeId) {
        throw new Error('No active shift found. Please open a shift first.');
      }
      await recordEvent({
        storeId,
        shiftId,
        eventType,
        amount,
        reason: reason || undefined,
      });
      loadEvents({ storeId });
      loadShiftSummary(shiftId);
    },
    [activeShiftId, storeId, recordEvent, loadEvents, loadShiftSummary, fetchActiveShift],
  );

  const renderEventItem = (e: CashEvent) => {
    const badge = EVENT_BADGE[e.eventType] ?? { color: '#6B7280', bg: '#F3F4F6' };
    return (
      <View key={e.id} style={tw`bg-white rounded-xl p-4 mb-2`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <View
            style={[tw`rounded-full px-2.5 py-1`, { backgroundColor: badge.bg }]}
          >
            <Text style={[tw`text-xs`, typography.captionSemibold, { color: badge.color }]}>
              {formatEventType(e.eventType)}
            </Text>
          </View>
          <Text style={[tw`text-base`, typography.headingSemibold]}>
            {formatCurrency(e.amount)}
          </Text>
        </View>
        <View style={tw`flex-row items-center justify-between mt-1`}>
          <Text style={[tw`text-xs text-gray-500 flex-1`, typography.caption]} numberOfLines={1}>
            {e.reason || 'No reason'}
          </Text>
          <View style={tw`flex-row items-center ml-2`}>
            {e.createdByName ? (
              <Text style={[tw`text-xs text-gray-400 mr-2`, typography.caption]}>
                {e.createdByName}
              </Text>
            ) : null}
            <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
              {formatTime(e.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3`, typography.headingSemibold]}>Cash Till</Text>
      </View>

      <ScrollView
        contentContainerStyle={tw`p-4 pb-8`}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadAll} />}
      >
        {/* Shift Summary */}
        {shiftSummary && (
          <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
            <Text style={[tw`text-xs text-gray-400 uppercase mb-3`, typography.captionSemibold]}>
              Shift Cash Summary
            </Text>
            <SummaryRow label="Opening Float" value={formatCurrency(shiftSummary.openingFloat)} />
            <SummaryRow label="Cash Sales" value={formatCurrency(shiftSummary.totalCashSales)} />
            <SummaryRow label="Cash Drops" value={formatCurrency(shiftSummary.totalCashDrops)} />
            <SummaryRow label="Paid In" value={formatCurrency(shiftSummary.totalPaidIn)} />
            <SummaryRow label="Paid Out" value={formatCurrency(shiftSummary.totalPaidOut)} />
            <SummaryRow label="Safe Drops" value={formatCurrency(shiftSummary.totalSafeDrops)} />
            <View style={tw`border-t border-gray-100 mt-2 pt-2`}>
              <SummaryRow
                label="Expected Cash"
                value={formatCurrency(shiftSummary.expectedCash)}
                bold
              />
            </View>
            {shiftSummary.variance != null && (
              <SummaryRow
                label="Variance"
                value={`${shiftSummary.variance >= 0 ? '+' : ''}${formatCurrency(shiftSummary.variance)}`}
                bold
                color={shiftSummary.variance >= 0 ? '#16A34A' : '#DC2626'}
              />
            )}
          </View>
        )}

        {/* Action Buttons 2x2 Grid */}
        <View style={tw`flex-row flex-wrap mb-4`}>
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.eventType}
              style={[
                tw`rounded-2xl p-4 items-center justify-center border`,
                {
                  width: '48.5%',
                  marginRight: ACTIONS.indexOf(a) % 2 === 0 ? '3%' : 0,
                  marginBottom: 12,
                  borderColor: a.color + '30',
                  backgroundColor: a.bg,
                },
              ]}
              onPress={() => setModalAction(a)}
            >
              <View
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center mb-2`,
                  { backgroundColor: a.color + '20' },
                ]}
              >
                <MaterialCommunityIcons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={[tw`text-sm`, typography.bodySemibold, { color: a.color }]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Drawers */}
        {drawers.length > 0 && (
          <>
            <Text
              style={[tw`text-xs text-gray-400 uppercase mb-2`, typography.captionSemibold]}
            >
              Drawers
            </Text>
            {drawers.map((d) => (
              <View key={d.id} style={tw`bg-white rounded-xl p-4 mb-2 flex-row items-center`}>
                <View
                  style={tw`w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3`}
                >
                  <MaterialCommunityIcons name="cash-register" size={20} color="#2563EB" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-sm`, typography.bodySemibold]}>{d.name}</Text>
                  <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
                    #{d.drawerNumber}
                  </Text>
                </View>
                <View
                  style={tw`rounded-full px-2 py-0.5 ${d.isActive ? 'bg-green-100' : 'bg-gray-100'}`}
                >
                  <Text
                    style={[
                      tw`text-xs ${d.isActive ? 'text-green-700' : 'text-gray-500'}`,
                      typography.captionSemibold,
                    ]}
                  >
                    {d.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Recent Events */}
        <Text
          style={[tw`text-xs text-gray-400 uppercase mb-2 mt-4`, typography.captionSemibold]}
        >
          Recent Events
        </Text>
        {events.length > 0 ? (
          events.slice(0, 20).map(renderEventItem)
        ) : (
          <View style={tw`items-center py-8`}>
            <MaterialCommunityIcons name="cash-remove" size={40} color="#9CA3AF" />
            <Text style={[tw`text-gray-400 mt-3`, typography.body]}>No cash events</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Modal */}
      <ActionModal
        visible={!!modalAction}
        action={modalAction}
        onClose={() => setModalAction(null)}
        onSubmit={(amount, reason) =>
          handleSubmitEvent(modalAction!.eventType, amount, reason)
        }
      />
    </SafeAreaView>
  );
}
