import React, { useEffect, useState, useCallback } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOrder } from '@/contexts/OrderContext';
import { usePayments } from '@/contexts/PaymentsContext';
import TipSelector from '@/components/payment/TipSelector';
import TenderSelector from '@/components/payment/TenderSelector';
import SplitOptions from '@/components/payment/SplitOptions';
import type {
  Check,
  HospitalityPaymentType,
  HospitalityPayment,
  SplitType,
} from '@/types/hospitality';

type FlowStage = 'checkout' | 'processing' | 'success';

export default function PaymentScreen() {
  const { checkId } = useLocalSearchParams<{ checkId: string }>();
  const router = useRouter();
  const { loadCheck, splitCheck } = useOrder();
  const { payments, loadPaymentsForCheck, processPayment, isProcessing } =
    usePayments();

  const [check, setCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<FlowStage>('checkout');
  const [showSplit, setShowSplit] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [selectedTender, setSelectedTender] = useState<{
    type: HospitalityPaymentType;
    amount: number;
  } | null>(null);
  const [lastPayment, setLastPayment] = useState<HospitalityPayment | null>(null);

  const load = useCallback(async () => {
    if (!checkId) return;
    setLoading(true);
    try {
      const data = await loadCheck(Number(checkId));
      setCheck(data);
      await loadPaymentsForCheck(Number(checkId));
    } catch {
      Alert.alert('Error', 'Failed to load check details');
    } finally {
      setLoading(false);
    }
  }, [checkId, loadCheck, loadPaymentsForCheck]);

  useEffect(() => {
    load();
  }, [load]);

  const reloadCheck = useCallback(async () => {
    if (!checkId) return;
    try {
      const data = await loadCheck(Number(checkId));
      setCheck(data);
      await loadPaymentsForCheck(Number(checkId));
    } catch {}
  }, [checkId, loadCheck, loadPaymentsForCheck]);

  const paymentAmount = selectedTender?.amount ?? check?.balanceDue ?? 0;

  const handleQuickPay = () => {
    if (!check) return;
    setSelectedTender({ type: 'ECENTRIC', amount: check.balanceDue });
  };

  const handleSelectTender = (type: HospitalityPaymentType, amount: number) => {
    setSelectedTender({ type, amount });
  };

  const handleSplit = async (splitType: SplitType, config: any) => {
    if (!check) return;
    try {
      await splitCheck(check.id, {
        splitType,
        itemIds: config.itemIds,
        amounts: config.amounts,
      });
      await reloadCheck();
      setShowSplit(false);
    } catch (e: any) {
      Alert.alert('Split Failed', e.message || 'Could not split the check');
    }
  };

  const handleProcessPayment = async () => {
    if (!check || !selectedTender) return;
    try {
      const payment = await processPayment({
        checkId: check.id,
        paymentType: selectedTender.type,
        amount: selectedTender.amount,
        tipAmount: tipAmount > 0 ? tipAmount : undefined,
      });
      setLastPayment(payment);
      await reloadCheck();
      setStage('success');
    } catch (e: any) {
      Alert.alert('Payment Failed', e.message || 'Could not process payment');
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!check) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Text style={[tw`text-center mt-10 text-gray-500`, typography.body]}>
          Check not found
        </Text>
      </SafeAreaView>
    );
  }

  if (stage === 'success') {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <View style={tw`w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6`}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#16A34A" />
          </View>
          <Text style={[tw`text-2xl text-center mb-2`, typography.h2]}>
            Payment Successful
          </Text>
          <Text style={[tw`text-gray-500 text-center mb-1`, typography.body]}>
            R{lastPayment?.totalAmount?.toFixed(2) ?? '0.00'} paid
            {lastPayment?.tipAmount ? ` (incl. R${lastPayment.tipAmount?.toFixed(2)} tip)` : ''}
          </Text>
          {(check.balanceDue ?? 0) > 0 && (
            <Text style={[tw`text-red-500 text-center`, typography.captionSemibold]}>
              Remaining balance: R{(check.balanceDue ?? 0).toFixed(2)}
            </Text>
          )}

          <View style={tw`w-full mt-8 gap-3`}>
            <TouchableOpacity
              style={tw`flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3`}
              onPress={() => Alert.alert('Print', 'Sending to printer...')}
            >
              <MaterialCommunityIcons name="printer-outline" size={20} color="#374151" />
              <Text style={[tw`ml-2 text-base text-gray-700`, typography.bodySemibold]}>
                Print Receipt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3`}
              onPress={() => Alert.alert('Email', 'Email receipt sent')}
            >
              <MaterialCommunityIcons name="email-outline" size={20} color="#374151" />
              <Text style={[tw`ml-2 text-base text-gray-700`, typography.bodySemibold]}>
                Email Receipt
              </Text>
            </TouchableOpacity>

            {check.balanceDue > 0 ? (
              <TouchableOpacity
                style={tw`bg-blue-500 rounded-xl py-3.5 items-center`}
                onPress={() => {
                  setStage('checkout');
                  setSelectedTender(null);
                  setTipAmount(0);
                }}
              >
                <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                  Pay Remaining Balance
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={tw`bg-green-600 rounded-xl py-3.5 items-center`}
                onPress={() => router.back()}
              >
                <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                  Done
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const itemCount = (check.items || []).filter((i) => i.status !== 'VOIDED').length;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3 flex-1`, typography.h3]}>
          Payment
        </Text>
        <Text style={[tw`text-sm text-gray-500`, typography.caption]}>
          #{check.checkNumber}
        </Text>
      </View>

      <ScrollView contentContainerStyle={tw`px-4 pb-32`}>
        {/* Check Summary */}
        <View style={tw`bg-white rounded-xl px-4 py-4 mt-4`}>
          <Text style={[tw`text-sm text-gray-500 mb-3`, typography.captionSemibold]}>
            CHECK SUMMARY
          </Text>

          <SummaryRow label={`Items (${itemCount})`} value={check.subtotal} />
          {check.discountAmount > 0 && (
            <SummaryRow label="Discounts" value={-check.discountAmount} isDiscount />
          )}
          {check.serviceChargeAmount > 0 && (
            <SummaryRow label="Service Charge" value={check.serviceChargeAmount} />
          )}
          <SummaryRow label="Tax" value={check.taxAmount} />

          <View style={tw`flex-row justify-between pt-3 mt-2 border-t border-gray-100`}>
            <Text style={[tw`text-lg`, typography.h3]}>Total</Text>
            <Text style={[tw`text-lg`, typography.h3]}>
              R{(check.totalAmount ?? 0).toFixed(2)}
            </Text>
          </View>

          {(check.paidAmount ?? 0) > 0 && (
            <View style={tw`flex-row justify-between mt-1`}>
              <Text style={[tw`text-green-600`, typography.caption]}>Paid</Text>
              <Text style={[tw`text-green-600`, typography.captionSemibold]}>
                R{(check.paidAmount ?? 0).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={tw`flex-row justify-between mt-1`}>
            <Text
              style={[
                tw`${check.balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`,
                typography.bodySemibold,
              ]}
            >
              Balance Due
            </Text>
            <Text
              style={[
                tw`${check.balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`,
                typography.bodySemibold,
              ]}
            >
              R{(check.balanceDue ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {(check.balanceDue ?? 0) > 0 && (
          <>
            {/* Quick Pay */}
            <TouchableOpacity
              style={tw`mt-4 bg-blue-500 rounded-xl py-4 items-center flex-row justify-center`}
              onPress={handleQuickPay}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="flash" size={22} color="#fff" />
              <Text style={[tw`text-white text-base ml-2`, typography.bodySemibold]}>
                Quick Pay — R{(check.balanceDue ?? 0).toFixed(2)}
              </Text>
            </TouchableOpacity>

            {/* Split Check */}
            <TouchableOpacity
              style={tw`flex-row items-center justify-between mt-4 bg-white rounded-xl px-4 py-3`}
              onPress={() => setShowSplit((v) => !v)}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons name="call-split" size={22} color="#6B7280" />
                <Text style={[tw`ml-3 text-base text-gray-800`, typography.bodySemibold]}>
                  Split Check
                </Text>
              </View>
              <MaterialCommunityIcons
                name={showSplit ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#9CA3AF"
              />
            </TouchableOpacity>
            {showSplit && <SplitOptions check={check} onSplitSelect={handleSplit} />}

            {/* Tip */}
            <TipSelector
              subtotal={check.subtotal}
              onTipChange={setTipAmount}
              selectedTip={tipAmount}
            />

            {/* Tender */}
            <TenderSelector
              amount={check.balanceDue + tipAmount}
              balanceDue={check.balanceDue}
              onSelectTender={handleSelectTender}
            />
          </>
        )}

        {/* Existing payments */}
        {payments.length > 0 && (
          <View style={tw`bg-white rounded-xl px-4 py-4 mt-3`}>
            <Text style={[tw`text-sm text-gray-500 mb-2`, typography.captionSemibold]}>
              PAYMENTS MADE
            </Text>
            {payments.map((p) => (
              <View
                key={p.id}
                style={tw`flex-row justify-between py-2 border-b border-gray-50`}
              >
                <View>
                  <Text style={[tw`text-base`, typography.body]}>
                    {p.paymentType.replace(/_/g, ' ')}
                  </Text>
                  {p.tipAmount > 0 && (
                    <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                      Incl. tip R{(p.tipAmount ?? 0).toFixed(2)}
                    </Text>
                  )}
                </View>
                <Text style={[tw`text-base`, typography.bodySemibold]}>
                  R{(p.totalAmount ?? 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Process Payment Button */}
      {check.balanceDue > 0 && selectedTender && (
        <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3`}>
          <View style={tw`flex-row justify-between mb-2`}>
            <Text style={[tw`text-gray-500`, typography.caption]}>
              {selectedTender.type.replace(/_/g, ' ')} • R{selectedTender.amount.toFixed(2)}
              {tipAmount > 0 ? ` + R${tipAmount.toFixed(2)} tip` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={tw`bg-green-600 rounded-xl py-3.5 items-center ${isProcessing ? 'opacity-70' : ''}`}
            onPress={handleProcessPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                Process Payment — R{(selectedTender.amount + tipAmount).toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  isDiscount = false,
}: {
  label: string;
  value: number;
  isDiscount?: boolean;
}) {
  return (
    <View style={tw`flex-row justify-between mb-1`}>
      <Text style={[tw`text-gray-500`, typography.caption]}>{label}</Text>
      <Text
        style={[
          tw`${isDiscount ? 'text-green-600' : 'text-gray-800'}`,
          typography.caption,
        ]}
      >
        {isDiscount ? '-' : ''}R{Math.abs(value).toFixed(2)}
      </Text>
    </View>
  );
}
