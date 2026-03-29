import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOrder } from '@/contexts/OrderContext';
import { usePayments } from '@/contexts/PaymentsContext';
import TipSelector from './TipSelector';
import TenderSelector from './TenderSelector';
import SplitOptions from './SplitOptions';
import type {
  Check,
  HospitalityPayment,
  HospitalityPaymentType,
  SplitType,
} from '@/types/hospitality';

type PaymentStage = 'SUMMARY' | 'TIP' | 'TENDER' | 'PROCESSING' | 'RESULT';

interface HospitalityPaymentSheetProps {
  visible: boolean;
  checkId: number;
  onClose: () => void;
  onComplete: () => void;
}

export default function HospitalityPaymentSheet({
  visible,
  checkId,
  onClose,
  onComplete,
}: HospitalityPaymentSheetProps) {
  const { loadCheck, splitCheck, currentCheck } = useOrder();
  const { payments, loadPaymentsForCheck, processPayment, isProcessing } = usePayments();

  const [check, setCheck] = useState<Check | null>(null);
  const [stage, setStage] = useState<PaymentStage>('SUMMARY');
  const [tipAmount, setTipAmount] = useState(0);
  const [lastPayment, setLastPayment] = useState<HospitalityPayment | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await loadCheck(checkId);
      setCheck(data);
      await loadPaymentsForCheck(checkId);
    } catch {
      // handled by context
    }
  }, [checkId, loadCheck, loadPaymentsForCheck]);

  useEffect(() => {
    if (visible) {
      setStage('SUMMARY');
      setTipAmount(0);
      setLastPayment(null);
      setPaymentError(null);
      setShowSplit(false);
      setLoading(true);
      setPartialPaymentAmount(null);
      reload().finally(() => setLoading(false));
    }
  }, [visible, reload]);

  const balanceDue = check?.balanceDue ?? check?.totalAmount ?? 0;
  // If a partial payment amount was set (from even split or custom amount), use that.
  // Otherwise pay the full balance.
  const paymentAmount = partialPaymentAmount != null ? Math.min(partialPaymentAmount, balanceDue) : balanceDue;
  const totalWithTip = paymentAmount + tipAmount;

  const handleSelectTender = async (type: HospitalityPaymentType, tenderedAmount: number) => {
    if (!check) return;
    setStage('PROCESSING');
    setPaymentError(null);
    try {
      const payment = await processPayment({
        checkId: check.id,
        paymentType: type,
        amount: paymentAmount,
        tipAmount: tipAmount > 0 ? tipAmount : undefined,
      });
      setLastPayment(payment);

      const updatedCheck = await loadCheck(check.id);
      setCheck(updatedCheck);
      await loadPaymentsForCheck(check.id);

      setStage('RESULT');
    } catch (e: any) {
      setPaymentError(e.message || 'Payment failed. Please try again.');
      setStage('RESULT');
    }
  };

  const handleSplit = async (splitType: SplitType, config: { splitCount?: number; itemIds?: number[]; amounts?: number[] }) => {
    if (!check) return;

    if (splitType === 'EVEN' && config.splitCount && config.amounts?.length) {
      // EVEN split: don't call backend split API.
      // Instead, set the payment amount to per-person share and go to TIP.
      // The waiter collects one guest's payment at a time. After each payment,
      // the balance reduces and the next guest can pay their share.
      const perPerson = config.amounts[0];
      const actualBalance = check.balanceDue ?? check.totalAmount ?? 0;
      const amountToPay = Math.min(perPerson, actualBalance);
      setPartialPaymentAmount(amountToPay);
      setShowSplit(false);
      setStage('TIP');
      return;
    }

    if (splitType === 'BY_AMOUNT' && config.amounts?.length) {
      // BY_AMOUNT: pay a custom partial amount without splitting the check on the backend
      const actualBalance = check.balanceDue ?? check.totalAmount ?? 0;
      const amountToPay = Math.min(config.amounts[0], actualBalance);
      setPartialPaymentAmount(amountToPay);
      setShowSplit(false);
      setStage('TIP');
      return;
    }

    // BY_ITEM: actually split the check on the backend so items move to a new check
    try {
      await splitCheck(check.id, {
        splitType,
        itemIds: config.itemIds,
        amounts: config.amounts,
      });
      await reload();
      setShowSplit(false);
      Alert.alert('Check Split', 'Selected items have been moved to a new check.');
    } catch (e: any) {
      Alert.alert('Split Failed', e.message || 'Could not split the check.');
    }
  };

  const handlePayRemaining = () => {
    setTipAmount(0);
    setLastPayment(null);
    setPaymentError(null);
    setPartialPaymentAmount(null);
    setStage('SUMMARY');
  };

  const handleDone = () => {
    onComplete();
  };

  if (!visible) return null;

  if (loading || !check) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={tw`flex-1 bg-black/40 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl h-[70%] items-center justify-center`}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={tw`text-gray-500 mt-4`}>Loading check...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const activeItems = (check.items || []).filter((i) => i.status !== 'VOIDED');
  const currentBalanceDue = check.balanceDue ?? check.totalAmount ?? 0;
  const isFullyPaid = currentBalanceDue <= 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-black/40 justify-end`}>
        <View style={tw`bg-gray-50 rounded-t-3xl h-[85%]`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between px-6 pt-5 pb-3`}>
            <View>
              <Text style={[tw`text-xl text-gray-900`, typography.h2]}>
                {stage === 'SUMMARY' && 'Check Summary'}
                {stage === 'TIP' && 'Add Tip'}
                {stage === 'TENDER' && 'Payment Method'}
                {stage === 'PROCESSING' && 'Processing'}
                {stage === 'RESULT' && (paymentError ? 'Payment Failed' : 'Payment Complete')}
              </Text>
              <Text style={tw`text-gray-500 text-sm mt-0.5`}>
                #{check.checkNumber} {check.tableName ? `· ${check.tableName}` : ''}
              </Text>
            </View>
            {stage !== 'PROCESSING' && (
              <TouchableOpacity onPress={onClose} style={tw`p-2 bg-gray-100 rounded-full`}>
                <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={tw`px-6 pb-8`} showsVerticalScrollIndicator={false}>

            {/* STAGE: SUMMARY */}
            {stage === 'SUMMARY' && (
              <View>
                {/* Balance card */}
                <View style={tw`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4`}>
                  <View style={tw`flex-row justify-between items-center mb-4`}>
                    <Text style={tw`text-gray-500 text-sm`}>{check.guestCount} Guest{check.guestCount !== 1 ? 's' : ''}</Text>
                    <View style={tw`px-3 py-1 rounded-full ${isFullyPaid ? 'bg-green-50' : 'bg-blue-50'}`}>
                      <Text style={tw`text-xs ${isFullyPaid ? 'text-green-700' : 'text-blue-700'} font-semibold`}>
                        {isFullyPaid ? 'PAID' : 'OPEN'}
                      </Text>
                    </View>
                  </View>

                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-gray-500`}>Subtotal</Text>
                    <Text style={tw`text-gray-900`}>R{(check.subtotal ?? 0).toFixed(2)}</Text>
                  </View>
                  {(check.discountAmount ?? 0) > 0 && (
                    <View style={tw`flex-row justify-between mb-1`}>
                      <Text style={tw`text-gray-500`}>Discounts</Text>
                      <Text style={tw`text-green-600`}>-R{(check.discountAmount ?? 0).toFixed(2)}</Text>
                    </View>
                  )}
                  {(check.serviceChargeAmount ?? 0) > 0 && (
                    <View style={tw`flex-row justify-between mb-1`}>
                      <Text style={tw`text-gray-500`}>Service Charge</Text>
                      <Text style={tw`text-gray-900`}>R{(check.serviceChargeAmount ?? 0).toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-gray-500`}>Tax</Text>
                    <Text style={tw`text-gray-900`}>R{(check.taxAmount ?? 0).toFixed(2)}</Text>
                  </View>

                  <View style={tw`border-t border-dashed border-gray-200 mt-3 pt-3 flex-row justify-between`}>
                    <Text style={[tw`text-lg text-gray-900`, typography.h3]}>Total</Text>
                    <Text style={[tw`text-lg text-gray-900`, typography.h3]}>R{(check.totalAmount ?? 0).toFixed(2)}</Text>
                  </View>

                  {(check.paidAmount ?? 0) > 0 && (
                    <View style={tw`flex-row justify-between mt-2`}>
                      <Text style={tw`text-green-600`}>Paid</Text>
                      <Text style={tw`text-green-600 font-semibold`}>-R{(check.paidAmount ?? 0).toFixed(2)}</Text>
                    </View>
                  )}
                  {!isFullyPaid && (
                    <View style={tw`bg-red-50 rounded-xl mt-3 p-3 flex-row justify-between items-center`}>
                      <Text style={[tw`text-red-700`, typography.bodySemibold]}>Balance Due</Text>
                      <Text style={[tw`text-red-700 text-lg`, typography.h3]}>R{currentBalanceDue.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {/* Items summary */}
                <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4`}>
                  <Text style={[tw`text-sm text-gray-500 mb-3`, typography.captionSemibold]}>
                    ORDER ({activeItems.length} item{activeItems.length !== 1 ? 's' : ''})
                  </Text>
                  {activeItems.map((item) => (
                    <View key={item.id} style={tw`flex-row justify-between py-2 border-b border-gray-50`}>
                      <Text style={tw`text-gray-800 flex-1`}>
                        {item.quantity}x {item.menuItemName}
                      </Text>
                      <Text style={tw`text-gray-900 font-semibold`}>R{(item.totalPrice ?? 0).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                {/* Prior payments */}
                {payments.length > 0 && (
                  <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4`}>
                    <Text style={[tw`text-sm text-gray-500 mb-3`, typography.captionSemibold]}>
                      PAYMENTS MADE
                    </Text>
                    {payments.map((p) => (
                      <View key={p.id} style={tw`flex-row justify-between py-2 border-b border-gray-50`}>
                        <View>
                          <Text style={tw`text-gray-800`}>{p.paymentType.replace(/_/g, ' ')}</Text>
                          {(p.tipAmount ?? 0) > 0 && (
                            <Text style={tw`text-gray-400 text-xs`}>Incl. tip R{(p.tipAmount ?? 0).toFixed(2)}</Text>
                          )}
                        </View>
                        <Text style={tw`text-green-600 font-semibold`}>R{(p.totalAmount ?? 0).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Split option */}
                {!isFullyPaid && (
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 mb-4`}
                    onPress={() => setShowSplit((v) => !v)}
                  >
                    <View style={tw`flex-row items-center`}>
                      <MaterialCommunityIcons name="call-split" size={22} color="#6B7280" />
                      <Text style={[tw`ml-3 text-gray-800`, typography.bodySemibold]}>Split Check</Text>
                    </View>
                    <MaterialCommunityIcons name={showSplit ? 'chevron-up' : 'chevron-down'} size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                {showSplit && <SplitOptions check={check} onSplitSelect={handleSplit} />}

                {/* Action button */}
                {!isFullyPaid && (
                  <TouchableOpacity
                    style={tw`bg-blue-600 rounded-2xl py-4 items-center mt-2 shadow-sm`}
                    onPress={() => setStage('TIP')}
                  >
                    <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
                      Pay R{currentBalanceDue.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                )}
                {isFullyPaid && (
                  <TouchableOpacity
                    style={tw`bg-green-600 rounded-2xl py-4 items-center mt-2 shadow-sm`}
                    onPress={handleDone}
                  >
                    <Text style={[tw`text-white text-base`, typography.bodySemibold]}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* STAGE: TIP */}
            {stage === 'TIP' && (
              <View>
                <View style={tw`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4`}>
                  {partialPaymentAmount != null && (
                    <View style={tw`bg-blue-50 rounded-xl p-2.5 mb-3 flex-row items-center`}>
                      <MaterialCommunityIcons name="call-split" size={16} color="#2563EB" />
                      <Text style={tw`text-blue-700 text-sm ml-2`}>Partial payment (split)</Text>
                    </View>
                  )}
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <Text style={tw`text-gray-500`}>Amount to Pay</Text>
                    <Text style={[tw`text-gray-900`, typography.bodySemibold]}>R{paymentAmount.toFixed(2)}</Text>
                  </View>
                  {tipAmount > 0 && (
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-gray-500`}>Tip</Text>
                      <Text style={tw`text-blue-600 font-semibold`}>R{tipAmount.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={tw`border-t border-gray-100 pt-2 mt-1 flex-row justify-between`}>
                    <Text style={[tw`text-lg text-gray-900`, typography.h3]}>Total to Charge</Text>
                    <Text style={[tw`text-lg text-blue-600`, typography.h3]}>R{(paymentAmount + tipAmount).toFixed(2)}</Text>
                  </View>
                </View>

                <TipSelector
                  subtotal={check.subtotal ?? 0}
                  onTipChange={setTipAmount}
                  selectedTip={tipAmount}
                />

                <View style={tw`flex-row gap-3 mt-6`}>
                  <TouchableOpacity
                    style={tw`flex-1 bg-gray-200 rounded-2xl py-4 items-center`}
                    onPress={() => { setTipAmount(0); setPartialPaymentAmount(null); setStage('SUMMARY'); }}
                  >
                    <Text style={[tw`text-gray-700`, typography.bodySemibold]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`flex-[2] bg-blue-600 rounded-2xl py-4 items-center shadow-sm`}
                    onPress={() => setStage('TENDER')}
                  >
                    <Text style={[tw`text-white`, typography.bodySemibold]}>
                      Continue — R{(paymentAmount + tipAmount).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STAGE: TENDER */}
            {stage === 'TENDER' && (
              <View>
                <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-1`}>
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-gray-500`}>Payment</Text>
                    <Text style={tw`text-gray-900 font-semibold`}>R{paymentAmount.toFixed(2)}</Text>
                  </View>
                  {tipAmount > 0 && (
                    <View style={tw`flex-row justify-between mb-1`}>
                      <Text style={tw`text-gray-500`}>Tip</Text>
                      <Text style={tw`text-blue-600`}>R{tipAmount.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={tw`border-t border-gray-100 pt-2 mt-1 flex-row justify-between`}>
                    <Text style={[tw`text-gray-900`, typography.bodySemibold]}>Charging</Text>
                    <Text style={[tw`text-blue-600`, typography.bodySemibold]}>R{(paymentAmount + tipAmount).toFixed(2)}</Text>
                  </View>
                </View>

                <TenderSelector
                  amount={paymentAmount + tipAmount}
                  balanceDue={paymentAmount}
                  onSelectTender={handleSelectTender}
                />

                <TouchableOpacity
                  style={tw`mt-4 bg-gray-200 rounded-2xl py-4 items-center`}
                  onPress={() => setStage('TIP')}
                >
                  <Text style={[tw`text-gray-700`, typography.bodySemibold]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE: PROCESSING */}
            {stage === 'PROCESSING' && (
              <View style={tw`items-center justify-center py-20`}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={[tw`text-gray-900 text-lg mt-6`, typography.bodySemibold]}>Processing Payment...</Text>
                <Text style={tw`text-gray-500 mt-2`}>Please wait while we process your payment.</Text>
              </View>
            )}

            {/* STAGE: RESULT */}
            {stage === 'RESULT' && (
              <View>
                {paymentError ? (
                  <View style={tw`items-center py-10`}>
                    <View style={tw`w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-5`}>
                      <MaterialCommunityIcons name="close-circle" size={48} color="#DC2626" />
                    </View>
                    <Text style={[tw`text-xl text-gray-900 text-center mb-2`, typography.h2]}>Payment Failed</Text>
                    <Text style={tw`text-gray-500 text-center mb-6 px-4`}>{paymentError}</Text>
                    <TouchableOpacity
                      style={tw`bg-blue-600 rounded-2xl py-4 px-8 shadow-sm`}
                      onPress={() => { setPaymentError(null); setStage('TENDER'); }}
                    >
                      <Text style={[tw`text-white`, typography.bodySemibold]}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={tw`items-center py-8`}>
                    <View style={tw`w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-5`}>
                      <MaterialCommunityIcons name="check-circle" size={48} color="#16A34A" />
                    </View>
                    <Text style={[tw`text-xl text-gray-900 text-center mb-1`, typography.h2]}>Payment Successful</Text>
                    {lastPayment && (
                      <Text style={tw`text-gray-500 text-center`}>
                        R{(lastPayment.totalAmount ?? 0).toFixed(2)} via {lastPayment.paymentType.replace(/_/g, ' ')}
                        {(lastPayment.tipAmount ?? 0) > 0 ? ` (incl. R${(lastPayment.tipAmount ?? 0).toFixed(2)} tip)` : ''}
                      </Text>
                    )}

                    {/* Receipt actions */}
                    <View style={tw`w-full mt-8 gap-3`}>
                      <TouchableOpacity
                        style={tw`flex-row items-center justify-center bg-white border border-gray-200 rounded-2xl py-3.5 shadow-sm`}
                        onPress={() => Alert.alert('Print', 'Sending to printer...')}
                      >
                        <MaterialCommunityIcons name="printer-outline" size={20} color="#374151" />
                        <Text style={[tw`ml-2 text-gray-700`, typography.bodySemibold]}>Print Receipt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={tw`flex-row items-center justify-center bg-white border border-gray-200 rounded-2xl py-3.5 shadow-sm`}
                        onPress={() => Alert.alert('Email', 'Email receipt sent')}
                      >
                        <MaterialCommunityIcons name="email-outline" size={20} color="#374151" />
                        <Text style={[tw`ml-2 text-gray-700`, typography.bodySemibold]}>Email Receipt</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Balance remaining? */}
                    {(check.balanceDue ?? 0) > 0 ? (
                      <View style={tw`w-full mt-6 gap-3`}>
                        <View style={tw`bg-amber-50 rounded-xl p-3 flex-row justify-between items-center`}>
                          <Text style={tw`text-amber-700`}>Remaining Balance</Text>
                          <Text style={[tw`text-amber-700`, typography.bodySemibold]}>R{(check.balanceDue ?? 0).toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity
                          style={tw`bg-blue-600 rounded-2xl py-4 items-center shadow-sm`}
                          onPress={handlePayRemaining}
                        >
                          <Text style={[tw`text-white`, typography.bodySemibold]}>Pay Remaining Balance</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={tw`bg-gray-200 rounded-2xl py-4 items-center`}
                          onPress={handleDone}
                        >
                          <Text style={[tw`text-gray-700`, typography.bodySemibold]}>Done for Now</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={tw`w-full mt-6`}>
                        <View style={tw`bg-green-50 rounded-xl p-3 flex-row items-center justify-center mb-4`}>
                          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#16A34A" />
                          <Text style={tw`text-green-700 ml-2 font-semibold`}>Check fully paid and closed</Text>
                        </View>
                        <TouchableOpacity
                          style={tw`bg-green-600 rounded-2xl py-4 items-center shadow-sm`}
                          onPress={handleDone}
                        >
                          <Text style={[tw`text-white`, typography.bodySemibold]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
